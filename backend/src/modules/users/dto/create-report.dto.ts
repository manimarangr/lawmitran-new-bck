import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const REASONS = [
  'FAKE_PROFILE',
  'MISCONDUCT',
  'SPAM',
  'NO_SHOW',
  'ABUSIVE',
  'WRONG_INFO',
  'OTHER',
] as const;

export class CreateReportDto {
  @ApiProperty({ description: 'User being reported (lawyer or client)' })
  @IsString()
  reportedUserId: string;

  @ApiPropertyOptional({ description: 'Lead the two parties were in contact over' })
  @IsOptional()
  @IsString()
  leadId?: string;

  @ApiProperty({ enum: REASONS })
  @IsIn(REASONS as unknown as string[])
  reason: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}
