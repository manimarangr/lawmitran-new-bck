import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SetPlanTierDto {
  @ApiProperty({
    example: 4790,
    description: 'Total price for this plan+duration tier',
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    example: '1 year',
    description: 'Display label for the tier',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this tier is purchasable',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
