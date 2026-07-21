import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePlanTierDto {
  @ApiProperty({
    example: 60,
    description: 'Duration in days for the new tier',
  })
  @IsInt()
  @Min(1)
  durationDays: number;

  @ApiProperty({
    example: 899,
    description: 'Total price for this plan+duration tier',
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: '2 months' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
