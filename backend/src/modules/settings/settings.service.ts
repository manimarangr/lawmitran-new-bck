import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GROUPS, REGISTRY_KEYS, SETTINGS_REGISTRY } from './settings.registry';

const CACHE_TTL_MS = 30_000;

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private cache = new Map<string, { value: string | undefined; at: number }>();

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /** DB value → env var → undefined. Cached for 30s. */
  async get(key: string): Promise<string | undefined> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
    let value: string | undefined;
    try {
      const row = await this.prisma.platformSetting.findUnique({
        where: { key },
      });
      value = row?.value ?? process.env[key];
    } catch (err) {
      this.logger.warn(
        `settings lookup failed for ${key}: ${(err as Error).message}`,
      );
      value = process.env[key];
    }
    this.cache.set(key, { value, at: Date.now() });
    return value;
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const raw = await this.get(key);
    const n = Number(raw);
    return raw !== undefined && !Number.isNaN(n) ? n : fallback;
  }

  /** Toggle semantics: explicit 'false'/'0'/'off' disables; unset = fallback. */
  async getBool(key: string, fallback: boolean): Promise<boolean> {
    const raw = (await this.get(key))?.toLowerCase();
    if (raw === undefined || raw === '') return fallback;
    return !['false', '0', 'off', 'no'].includes(raw);
  }

  // ---- admin console ----

  /** Registry + stored state; secret values are never returned. */
  async adminList() {
    const rows = await this.prisma.platformSetting.findMany();
    const stored = new Map(rows.map((r) => [r.key, r.value]));
    return GROUPS.map((g) => ({
      ...g,
      settings: SETTINGS_REGISTRY.filter((d) => d.group === g.id).map((d) => ({
        key: d.key,
        label: d.label,
        type: d.type,
        options: d.options,
        placeholder: d.placeholder,
        help: d.help,
        value: d.type === 'secret' ? '' : (stored.get(d.key) ?? ''),
        isSet: stored.has(d.key) || process.env[d.key] !== undefined,
        overridden: stored.has(d.key), // true = DB value in effect (vs env/default)
      })),
    }));
  }

  /** Upsert entries; empty value deletes the row (reverts to env/default). */
  async adminSave(entries: { key: string; value: string }[]) {
    for (const e of entries) {
      if (!REGISTRY_KEYS.has(e.key)) {
        throw new BadRequestException(`Unknown setting: ${e.key}`);
      }
    }
    for (const e of entries) {
      const value = e.value?.trim() ?? '';
      if (value === '') {
        await this.prisma.platformSetting.deleteMany({ where: { key: e.key } });
      } else {
        await this.prisma.platformSetting.upsert({
          where: { key: e.key },
          update: { value },
          create: { key: e.key, value },
        });
      }
    }
    this.cache.clear();

    const secretKeys = new Set(
      SETTINGS_REGISTRY.filter((d) => d.type === 'secret').map((d) => d.key),
    );
    await this.audit.log('SETTINGS_UPDATED', {
      entityType: 'PlatformSetting',
      summary: `Updated settings: ${entries.map((e) => e.key).join(', ')}`,
      newValue: Object.fromEntries(
        entries.map((e) => [
          e.key,
          secretKeys.has(e.key) ? (e.value ? '••••••' : '(cleared)') : e.value,
        ]),
      ),
    });
    return { saved: entries.length };
  }
}
