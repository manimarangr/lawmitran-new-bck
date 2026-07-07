import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WithdrawLeadDto {
  @ApiPropertyOptional({
    example: 'Found a lawyer elsewhere',
    description: 'Optional reason for withdrawing the requirement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
