import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export const CASE_STATUSES = [
  'NEW',
  'CONSULTATION',
  'NOTICE_SENT',
  'CASE_FILED',
  'EVIDENCE',
  'ARGUMENTS',
  'JUDGMENT_RESERVED',
  'DISPOSED',
  'CLOSED',
  'ARCHIVED',
] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export class DiaryClientDto {
  @IsString() @MinLength(2) @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(15) mobile?: string;
  @IsOptional() @IsString() @MaxLength(160) email?: string;
  @IsOptional() @IsString() @MaxLength(400) address?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class DiaryClientUpdateDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(15) mobile?: string;
  @IsOptional() @IsString() @MaxLength(160) email?: string;
  @IsOptional() @IsString() @MaxLength(400) address?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class DiaryCaseCreateDto {
  @IsString() clientId: string;
  @IsString() @MinLength(3) @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(80) caseNumber?: string;
  @IsOptional() @IsString() @MaxLength(160) courtName?: string;
  @IsOptional() @IsString() @MaxLength(40) courtHall?: string;
  @IsOptional() @IsString() @MaxLength(120) judgeName?: string;
  @IsOptional() @IsString() @MaxLength(80) practiceAreaSlug?: string;
  @IsOptional() @IsString() @MaxLength(80) caseType?: string;
  @IsOptional() @IsString() @MaxLength(200) oppositeParty?: string;
  @IsOptional() @IsIn(CASE_STATUSES) status?: string;
  @IsOptional() @IsString() @MaxLength(80) stage?: string;
  @IsOptional() @IsIn(PRIORITIES) priority?: string;
  @IsOptional() @IsString() @MaxLength(4000) description?: string;
  @IsOptional() @IsISO8601() dateFiled?: string;
  @IsOptional() @IsISO8601() nextHearingAt?: string;
  @IsOptional() @IsString() @MaxLength(2000) remarks?: string;
  @IsOptional() @IsString() @MaxLength(4000) lawyerNotes?: string;
}

export class DiaryCaseUpdateDto extends DiaryCaseCreateDto {
  @IsOptional() @IsString() declare clientId: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(200) declare title: string;
}

export class DiaryHearingDto {
  @IsISO8601() date: string;
  @IsOptional() @IsString() @MaxLength(40) courtNumber?: string;
  @IsOptional() @IsString() @MaxLength(120) judgeName?: string;
  @IsOptional() @IsString() @MaxLength(300) purpose?: string;
  @IsOptional() @IsString() @MaxLength(2000) outcome?: string;
  @IsOptional() @IsISO8601() nextHearingAt?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class DiaryCaseQueryDto {
  @IsOptional() @IsIn(CASE_STATUSES) status?: string;
  @IsOptional() @IsIn(PRIORITIES) priority?: string;
  @IsOptional() @IsString() @MaxLength(80) practiceArea?: string;
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
}

export class DiaryReminderDto {
  @IsOptional() @IsString() caseId?: string;
  @IsOptional()
  @IsIn(['HEARING', 'FOLLOW_UP', 'DOCUMENT', 'PAYMENT', 'CUSTOM'])
  type?: string;
  @IsISO8601() dueAt: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class DiaryReminderDoneDto {
  @IsBoolean() done: boolean;
}
