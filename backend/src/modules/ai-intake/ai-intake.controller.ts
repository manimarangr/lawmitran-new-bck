import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RateLimit } from '../../common/security/rate-limit.decorator';
import { CLARIFIES, GUIDANCE_TOPICS } from './guidance-topics';
import { AiIntakeService } from './ai-intake.service';

const TOPIC_KEYS = [...GUIDANCE_TOPICS.map((t) => t.key), 'general'];
const CLARIFY_KEYS = Object.keys(CLARIFIES);

class AskDto {
  @IsString()
  @MinLength(10, { message: 'Tell us a little more — at least 10 characters' })
  @MaxLength(600)
  question: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  /** Topic already decided by triage — lets the summary skip re-classification. */
  @IsOptional()
  @IsIn(TOPIC_KEYS)
  topicKey?: string;
}

class TriageDto {
  @IsString()
  @MinLength(10, { message: 'Tell us a little more — at least 10 characters' })
  @MaxLength(600)
  question: string;

  @IsOptional()
  @IsIn(CLARIFY_KEYS)
  clarifyKey?: string;

  @IsOptional()
  @IsIn(TOPIC_KEYS)
  topicKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  practiceOverride?: string;

  /** Option C interview transcript: "Q → A" lines. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(260, { each: true })
  answers?: string[];
}

@ApiTags('ai-intake')
@Controller('ai-intake')
export class AiIntakeController {
  constructor(private aiIntakeService: AiIntakeService) {}

  @Public()
  @RateLimit(12, 60_000)
  @Post('triage')
  @ApiOperation({
    summary:
      'Homepage triage — clarifying question(s) then routing targets. Never returns guidance content.',
  })
  triage(@Body() dto: TriageDto) {
    return this.aiIntakeService.triage(dto.question, {
      clarifyKey: dto.clarifyKey,
      topicKey: dto.topicKey,
      practiceOverride: dto.practiceOverride,
      answers: dto.answers,
    });
  }

  // Guidance summary: 3 free per day for anonymous visitors (per IP),
  // unlimited when signed in (docs/12 tiering).
  @Public()
  @RateLimit(6, 60_000)
  @Post('ask')
  @ApiOperation({
    summary:
      'Legal guidance summary (curated KB, informational — not advice). 3/day anonymous, unlimited signed-in.',
  })
  ask(@Body() dto: AskDto, @Req() req: Request) {
    return this.aiIntakeService.ask(
      dto.question,
      dto.city,
      { ip: req.ip, authHeader: req.headers.authorization },
      dto.topicKey,
    );
  }

  @Roles(Role.ADMIN)
  @Get('admin/insights')
  @ApiOperation({
    summary: 'Demand intelligence — 30d question volume by topic + KB gaps',
  })
  adminInsights() {
    return this.aiIntakeService.adminInsights();
  }
}
