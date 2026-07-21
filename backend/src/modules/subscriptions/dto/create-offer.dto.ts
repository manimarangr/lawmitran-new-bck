import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateOfferDto {
  @ApiProperty({ example: 'Diwali Offer' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    example: 'Festival of lights special — 20% off all plans',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['PERCENT', 'FLAT'], default: 'PERCENT' })
  @IsOptional()
  @IsIn(['PERCENT', 'FLAT'])
  discountType?: 'PERCENT' | 'FLAT';

  @ApiProperty({
    example: 20,
    description: 'Percent (0–100) or flat ₹ amount off',
  })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({
    example: 'PREMIUM',
    description: 'Limit to a plan; omit for all plans',
  })
  @IsOptional()
  @IsString()
  planName?: string;

  @ApiPropertyOptional({
    example: 365,
    description: 'Limit to a duration; omit for all durations',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiProperty({ example: '2026-10-25T00:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-11-05T23:59:59.000Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
