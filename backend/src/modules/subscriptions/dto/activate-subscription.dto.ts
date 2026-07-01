import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class ActivateSubscriptionDto {
  @ApiPropertyOptional({
    example: 'BASIC',
    description: 'Plan to activate: BASIC | PREMIUM (default BASIC)',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  planName?: string;

  @ApiPropertyOptional({
    example: 365,
    description:
      'Duration in days; must match a configured tier: 30, 90, 180, or 365 (default 30)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;
}
