import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TemplateStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import {
  canonicalPractice,
  classifyQuestion,
  CLARIFIES,
  GUIDANCE_TOPICS,
  GuidanceTopic,
  topicByKey,
} from './guidance-topics';
import { complete } from './llm.client';

const DISCLAIMER =
  'General legal information, not legal advice. Laws and timelines vary by state and facts — a verified lawyer should confirm before you act.';

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 500;

interface CachedAnswer {
  at: number;
  payload: unknown;
}

@Injectable()
export class AiIntakeService {
  private readonly logger = new Logger(AiIntakeService.name);
  private cache = new Map<string, CachedAnswer>();

  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ---- anonymous free-summary quota (3/day per IP, docs/12 tiering) ----
  private anonQuota = new Map<string, { day: string; count: number }>();
  private static readonly FREE_SUMMARIES_PER_DAY = 3;

  /** Returns the userId for a valid access token, else null (optional auth). */
  private verifyOptionalToken(authHeader?: string): string | null {
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    if (!token) return null;
    try {
      const payload = this.jwt.verify<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? '',
      });
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  private consumeAnonQuota(ip: string) {
    const day = new Date().toDateString();
    const rec = this.anonQuota.get(ip);
    if (!rec || rec.day !== day) {
      this.anonQuota.set(ip, { day, count: 1 });
      if (this.anonQuota.size > 5000) this.anonQuota.clear(); // bound memory
      return;
    }
    if (rec.count >= AiIntakeService.FREE_SUMMARIES_PER_DAY) {
      throw new ForbiddenException(
        'You have used your 3 free guidance summaries for today — create a free account for unlimited guidance.',
      );
    }
    rec.count += 1;
  }

  /** Spot a seeded city mentioned inside free text (words + bigrams, bounded). */
  private async detectCityInText(text: string): Promise<string | null> {
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const words = [...new Set(tokens)].slice(0, 15);
    const bigrams: string[] = [];
    for (let i = 0; i < tokens.length - 1 && bigrams.length < 8; i++) {
      const b = `${tokens[i]} ${tokens[i + 1]}`;
      if (b.length > 7) bigrams.push(b);
    }
    const candidates = [...bigrams, ...words].slice(0, 22);
    if (candidates.length === 0) return null;
    try {
      const hit = await this.prisma.city.findFirst({
        where: {
          OR: candidates.map((c) => ({
            name: { equals: c, mode: 'insensitive' as const },
          })),
        },
        select: { name: true },
      });
      return hit?.name ?? null;
    } catch {
      return null;
    }
  }

  private classify(question: string) {
    return classifyQuestion(question);
  }

  private async llmConfig() {
    if (!(await this.settings.getBool('AI_ENABLED', false))) return null;
    const apiKey = await this.settings.get('AI_API_KEY');
    if (!apiKey) return null;
    return {
      provider: (await this.settings.get('AI_PROVIDER')) || 'openai',
      apiKey,
      model: (await this.settings.get('AI_MODEL')) || '',
    };
  }

  /** P1: LLM picks a KB topic when keywords fail — selection only, never invention. */
  private async llmClassify(question: string): Promise<GuidanceTopic | null> {
    const cfg = await this.llmConfig();
    if (!cfg) return null;
    const keys = GUIDANCE_TOPICS.map((t) => `${t.key}: ${t.title}`).join('\n');
    const raw = await complete(
      cfg,
      'You map an Indian legal question to exactly one topic key from the list. If no topic clearly and specifically matches, you MUST reply "general" — never force the nearest topic. Reply with the key only — nothing else.',
      `Topics:\n${keys}\n\nQuestion: ${question}\n\nKey:`,
    );
    const key = raw
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z-]/g, '');
    return GUIDANCE_TOPICS.find((t) => t.key === key) ?? null;
  }

  /**
   * P1: personalize the KB guidance for this question. The prompt hard-constrains the
   * model to the supplied KB content — it rephrases and selects, it does not add law.
   */
  private async llmSynthesize(
    question: string,
    topic: GuidanceTopic,
  ): Promise<{ summary: string; steps: string[] } | null> {
    const cfg = await this.llmConfig();
    if (!cfg) return null;
    const raw = await complete(
      cfg,
      'You are a legal-information assistant for an Indian legal marketplace. You will receive a ' +
        'user question and vetted knowledge-base content. Rewrite the summary so it speaks to the ' +
        "user's situation and keep the steps relevant, using ONLY facts, rules, and timelines " +
        'present in the knowledge base. Never add legal rules, sections, or numbers that are not ' +
        'in it. Never predict outcomes or give advice. Reply as JSON: ' +
        '{"summary": string, "steps": string[]} with at most 5 short steps.',
      `Question: ${question}\n\nKnowledge base — ${topic.title}\nSummary: ${topic.summary}\nSteps:\n${topic.steps
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n')}`,
    );
    if (!raw) return null;
    try {
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}');
      const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
        summary?: string;
        steps?: string[];
      };
      if (
        typeof parsed.summary === 'string' &&
        parsed.summary.length > 20 &&
        Array.isArray(parsed.steps) &&
        parsed.steps.length > 0 &&
        parsed.steps.every((s) => typeof s === 'string')
      ) {
        return { summary: parsed.summary, steps: parsed.steps.slice(0, 5) };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generic QA: when NO KB topic matches, the LLM answers with cautious,
   * high-level general information for India instead of the fixed fallback
   * text. Guardrails: informational only, no outcome predictions, no invented
   * citations, must end at a verified lawyer. JSON-validated; any failure
   * (including the quota circuit breaker) degrades to the deterministic
   * fallback summary.
   */
  private async llmGeneralAnswer(
    question: string,
  ): Promise<{ summary: string; steps: string[] } | null> {
    const cfg = await this.llmConfig();
    if (!cfg) return null;
    const raw = await complete(
      cfg,
      'You are a legal-information assistant for an Indian legal marketplace. Answer the ' +
        "user's question with GENERAL legal information for India only. Strict rules: no " +
        'legal advice, no outcome predictions, no fee estimates; do not cite section numbers ' +
        'or case law unless you are completely certain they are correct; never ask for ' +
        'personal data; plain language, practical tone. If the question is not a legal ' +
        'matter, say so briefly. The LAST step must be to describe the matter to a verified ' +
        'lawyer for confirmation. Reply as JSON only: {"summary": string, "steps": string[]} ' +
        'with a summary of 2-4 sentences and at most 5 short steps.',
      `Question: ${question}`,
    );
    if (!raw) return null;
    try {
      const parsed = JSON.parse(
        raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1),
      ) as {
        summary?: string;
        steps?: string[];
      };
      if (
        typeof parsed.summary === 'string' &&
        parsed.summary.length > 20 &&
        Array.isArray(parsed.steps) &&
        parsed.steps.length > 0 &&
        parsed.steps.every((s) => typeof s === 'string')
      ) {
        return { summary: parsed.summary, steps: parsed.steps.slice(0, 5) };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Option C interviewer (docs/12): when keywords fail, the LLM asks short factual
   * multiple-choice questions (budget 3) to identify the topic. Chips-only output,
   * JSON-validated; any failure falls back to the deterministic generic tree.
   */
  private async llmInterview(
    question: string,
    answers: string[],
  ): Promise<
    | { kind: 'question'; question: string; options: string[] }
    | { kind: 'final'; topicKey: string; urgent: boolean }
    | null
  > {
    const cfg = await this.llmConfig();
    if (!cfg) return null;
    const mustFinal = answers.length >= 3;
    const topics = GUIDANCE_TOPICS.map((t) => `${t.key}: ${t.title}`).join(
      '\n',
    );
    const raw = await complete(
      cfg,
      'You are a legal-intake interviewer for an Indian legal marketplace. Your ONLY job is to ' +
        'identify which topic the user\u2019s issue belongs to by asking short factual ' +
        'multiple-choice questions (what happened / when / current status). Rules: never give ' +
        'advice or legal information; never ask for personal data (names, numbers, addresses); ' +
        'one question at a time; 3\u20136 short options covering the likely cases plus ' +
        '\u201cSomething else\u201d. ' +
        (mustFinal
          ? 'You have used your question budget \u2014 you MUST decide now. '
          : 'If you can already tell the topic confidently, decide now. ') +
        'If the input is clearly NOT a legal matter at all (food, greetings, jokes, homework, ' +
        'weather, chit-chat), reply {"final": "not-legal"} immediately \u2014 do not ask questions. ' +
        'To decide, reply {"final": "<topicKey>", "urgency": "high"|"normal"} using a topicKey ' +
        'from the list ("general" if nothing fits). To ask, reply ' +
        '{"question": "...", "options": ["...", "..."]}. Reply with JSON only.',
      `Topics:\n${topics}\n\nUser issue: ${question}\n${
        answers.length ? `Interview so far:\n${answers.join('\n')}\n` : ''
      }\nJSON:`,
    );
    if (!raw) return null;
    try {
      const parsed = JSON.parse(
        raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1),
      ) as {
        question?: string;
        options?: unknown[];
        final?: string;
        urgency?: string;
      };
      if (typeof parsed.final === 'string') {
        const key = parsed.final.trim().toLowerCase();
        const valid =
          GUIDANCE_TOPICS.some((t) => t.key === key) ||
          key === 'general' ||
          key === 'not-legal';
        return {
          kind: 'final',
          topicKey: valid ? key : 'general',
          urgent: parsed.urgency === 'high',
        };
      }
      if (
        !mustFinal &&
        typeof parsed.question === 'string' &&
        parsed.question.trim().length >= 5 &&
        parsed.question.length <= 180 &&
        Array.isArray(parsed.options)
      ) {
        const options = parsed.options
          .filter((o): o is string => typeof o === 'string')
          .map((o) => o.trim())
          .filter((o) => o.length >= 2 && o.length <= 70)
          .slice(0, 6);
        if (options.length >= 2) {
          return {
            kind: 'question',
            question: parsed.question.trim(),
            options,
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async ask(
    question: string,
    city?: string,
    ctx?: { ip?: string; authHeader?: string },
    topicKey?: string,
  ) {
    // 3 free summaries/day for anonymous visitors; unlimited when signed in.
    const userId = this.verifyOptionalToken(ctx?.authHeader);
    const detectedCity = await this.detectCityInText(question);
    const effectiveCity = city?.trim() || detectedCity || undefined;

    const cacheKey = `${question.trim().toLowerCase()}|${effectiveCity?.toLowerCase() ?? ''}|${topicKey ?? ''}`;
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      if (!userId) this.consumeAnonQuota(ctx?.ip ?? 'unknown');
      return hit.payload;
    }
    if (!userId) this.consumeAnonQuota(ctx?.ip ?? 'unknown');
    city = effectiveCity;

    // Reuse the topic triage already decided (clarify tree / interview) —
    // saves one LLM classification call per summary.
    let topic: GuidanceTopic;
    let matched: boolean;
    if (topicKey) {
      topic = topicByKey(topicKey);
      matched = topic.key !== 'general';
    } else {
      ({ topic, matched } = this.classify(question));
      if (!matched) {
        const llmTopic = await this.llmClassify(question);
        if (llmTopic) {
          topic = llmTopic;
          matched = true;
        }
      }
    }

    let summary = topic.summary;
    let steps = topic.steps;
    let aiUsed = false;
    if (matched) {
      const synth = await this.llmSynthesize(question, topic);
      if (synth) {
        summary = synth.summary;
        steps = synth.steps;
        aiUsed = true;
      }
    } else {
      // Generic QA: no KB topic matched — cautious LLM general answer instead
      // of the fixed fallback text. Degrades to the boilerplate when AI is
      // disabled, failing, or quota-paused.
      const generic = await this.llmGeneralAnswer(question);
      if (generic) {
        summary = generic.summary;
        steps = generic.steps;
        aiUsed = true;
      }
    }

    const [lawyers, templates] = await Promise.all([
      this.prisma.lawyer.findMany({
        where: {
          verificationStatus: VerificationStatus.APPROVED,
          ...(topic.practiceMatch
            ? {
                practiceAreas: {
                  some: {
                    practiceArea: {
                      name: {
                        contains: topic.practiceMatch,
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              }
            : {}),
          ...(city?.trim()
            ? {
                serviceAreas: {
                  some: {
                    active: true,
                    city: {
                      name: { equals: city.trim(), mode: 'insensitive' },
                    },
                  },
                },
              }
            : {}),
        },
        take: 3,
        orderBy: [{ ratingAvg: 'desc' }, { experienceYears: 'desc' }],
        select: {
          id: true,
          fullName: true,
          slug: true,
          experienceYears: true,
          ratingAvg: true,
          ratingCount: true,
          profileImageUrl: true,
          city: { select: { name: true } },
          practiceAreas: {
            select: { practiceArea: { select: { name: true } } },
            take: 3,
          },
        },
      }),
      topic.templateMatch?.length
        ? this.prisma.documentTemplate.findMany({
            where: {
              status: TemplateStatus.PUBLISHED,
              OR: topic.templateMatch.map((m) => ({
                title: { contains: m, mode: 'insensitive' as const },
              })),
            },
            take: 3,
            select: { id: true, title: true, slug: true, price: true },
          })
        : Promise.resolve([]),
    ]);

    const payload = {
      matched,
      topicKey: topic.key,
      title: topic.title,
      practiceArea: topic.practiceMatch || null,
      summary,
      steps,
      urgentNote: topic.urgentNote ?? null,
      lawyers,
      templates,
      propertyCheck: topic.key === 'property-purchase',
      aiUsed,
      detectedCity,
      disclaimer: DISCLAIMER,
    };

    // demand intelligence — never blocks the answer
    try {
      await this.prisma.aiIntakeLog.create({
        data: {
          question: question.slice(0, 600),
          topicKey: topic.key,
          matched,
          practiceArea: topic.practiceMatch || null,
          aiUsed,
        },
      });
    } catch (err) {
      this.logger.warn(`intake log failed: ${(err as Error).message}`);
    }

    if (this.cache.size >= CACHE_MAX) {
      const first = this.cache.keys().next().value;
      if (first !== undefined) this.cache.delete(first);
    }
    this.cache.set(cacheKey, { at: Date.now(), payload });
    return payload;
  }

  /**
   * v2 homepage triage (docs/12): clarify-then-route. Deterministic trees when
   * keywords match; the LLM interviewer (Option C, budget 3) for vague input;
   * generic tree as the final fallback. Never returns guidance content.
   */
  async triage(
    question: string,
    choice?: {
      clarifyKey?: string;
      topicKey?: string;
      practiceOverride?: string;
      answers?: string[];
    },
  ) {
    // A chip asked for a deeper deterministic clarify (e.g. generic → family).
    if (choice?.clarifyKey && CLARIFIES[choice.clarifyKey]) {
      const c = CLARIFIES[choice.clarifyKey];
      return {
        step: 'clarify' as const,
        clarifyKey: choice.clarifyKey,
        question: c.question,
        options: c.options,
      };
    }

    // Option C: continue an in-flight LLM interview.
    if (choice?.answers?.length && !choice.topicKey) {
      const r = await this.llmInterview(question, choice.answers);
      if (r?.kind === 'question') {
        return {
          step: 'interview' as const,
          question: r.question,
          options: r.options,
        };
      }
      if (r?.kind === 'final') {
        if (r.topicKey === 'not-legal') return this.notLegalStep(question);
        return this.buildRoute(
          topicByKey(r.topicKey),
          r.topicKey !== 'general',
          question,
          undefined,
          r.urgent,
          choice.answers,
        );
      }
      // interviewer failed mid-flight — deterministic fallback
      const c = CLARIFIES.general;
      return {
        step: 'clarify' as const,
        clarifyKey: 'general',
        question: c.question,
        options: c.options,
      };
    }

    let topic: GuidanceTopic;
    let matched: boolean;
    if (choice?.topicKey) {
      topic = topicByKey(choice.topicKey);
      matched = topic.key !== 'general';
    } else {
      const r = this.classify(question);
      topic = r.topic;
      matched = r.matched;
      if (!matched) {
        // Option C: the interviewer gets first shot at vague input.
        const iv = await this.llmInterview(question, []);
        if (iv?.kind === 'question') {
          return {
            step: 'interview' as const,
            question: iv.question,
            options: iv.options,
          };
        }
        if (iv?.kind === 'final' && iv.topicKey === 'not-legal') {
          return this.notLegalStep(question);
        }
        if (iv?.kind === 'final' && iv.topicKey !== 'general') {
          return this.buildRoute(
            topicByKey(iv.topicKey),
            true,
            question,
            undefined,
            iv.urgent,
          );
        }
        const c = CLARIFIES.general;
        return {
          step: 'clarify' as const,
          clarifyKey: 'general',
          question: c.question,
          options: c.options,
        };
      }
      if (CLARIFIES[topic.key]) {
        const c = CLARIFIES[topic.key];
        return {
          step: 'clarify' as const,
          clarifyKey: topic.key,
          question: c.question,
          options: c.options,
        };
      }
    }

    return this.buildRoute(
      topic,
      matched,
      question,
      choice?.practiceOverride,
      false,
      choice?.answers,
    );
  }

  /** Friendly off-ramp when the input isn't a legal matter at all. */
  private async notLegalStep(question: string) {
    try {
      await this.prisma.aiIntakeLog.create({
        data: {
          question: question.slice(0, 600),
          topicKey: 'not-legal',
          matched: false,
          practiceArea: null,
          aiUsed: true,
        },
      });
    } catch {
      /* logging never blocks the answer */
    }
    return {
      step: 'not-legal' as const,
      message:
        'This doesn’t look like a legal question — and that’s fine! LawMitran helps with legal problems in India: property, family, money, work, police and consumer issues.',
    };
  }

  /** Routing payload + demand-intelligence log (interview transcript included). */
  private async buildRoute(
    topic: GuidanceTopic,
    matched: boolean,
    question: string,
    practiceOverride?: string,
    urgent = false,
    answers?: string[],
  ) {
    const practice = practiceOverride ?? topic.practiceMatch ?? '';
    const detectedCity = await this.detectCityInText(question);
    const templates = topic.templateMatch?.length
      ? await this.prisma.documentTemplate.findMany({
          where: {
            status: TemplateStatus.PUBLISHED,
            OR: topic.templateMatch.map((m) => ({
              title: { contains: m, mode: 'insensitive' as const },
            })),
          },
          take: 3,
          select: { id: true, title: true, slug: true, price: true },
        })
      : [];

    const logText = [question, ...(answers ?? [])].join(' | ').slice(0, 600);
    try {
      await this.prisma.aiIntakeLog.create({
        data: {
          question: logText,
          topicKey: topic.key,
          matched,
          practiceArea: practice || null,
          aiUsed: (answers?.length ?? 0) > 0 || urgent,
        },
      });
    } catch (err) {
      this.logger.warn(`triage log failed: ${(err as Error).message}`);
    }

    return {
      step: 'route' as const,
      topicKey: topic.key,
      title: topic.title,
      // Canonical seeded name (e.g. 'property' → 'Property Law') so the
      // /lawyers?practiceArea= link matches the search filter exactly.
      practiceArea: practice ? canonicalPractice(practice) : null,
      urgentNote:
        topic.urgentNote ??
        (urgent
          ? 'This looks time-sensitive — speak to a lawyer as soon as possible.'
          : null),
      templates,
      propertyCheck: topic.key === 'property-purchase',
      detectedCity,
      disclaimer: DISCLAIMER,
    };
  }

  /** Admin: 30-day demand picture + unmatched questions (KB gaps). */
  async adminInsights() {
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const [byTopic, total, unmatchedCount, recentUnmatched] = await Promise.all(
      [
        this.prisma.aiIntakeLog.groupBy({
          by: ['topicKey'],
          where: { createdAt: { gte: d30 } },
          _count: { topicKey: true },
          orderBy: { _count: { topicKey: 'desc' } },
          take: 10,
        }),
        this.prisma.aiIntakeLog.count({ where: { createdAt: { gte: d30 } } }),
        this.prisma.aiIntakeLog.count({
          where: { createdAt: { gte: d30 }, matched: false },
        }),
        this.prisma.aiIntakeLog.findMany({
          where: { matched: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, question: true, createdAt: true },
        }),
      ],
    );
    return {
      total,
      unmatchedCount,
      topics: byTopic.map((t) => ({
        topicKey: t.topicKey,
        count: t._count.topicKey,
      })),
      recentUnmatched,
    };
  }
}
