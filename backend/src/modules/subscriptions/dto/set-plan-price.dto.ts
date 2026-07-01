import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class SetPlanPriceDto {
  @ApiProperty({ example: 1000, description: 'Monthly price for this plan' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    example: 25,
    description: 'Max new leads per month for this plan; omit/null for unlimited',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyLeadCap?: number | null;
}
