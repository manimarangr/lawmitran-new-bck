import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewReportDto {
  @ApiProperty({ enum: ReportStatus, example: ReportStatus.ACTIONED })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiPropertyOptional({ description: 'Internal note / action taken', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;

  @ApiPropertyOptional({
    description: 'If true and status=ACTIONED, suspend the reported user',
    example: false,
  })
  @IsOptional()
  suspendReportedUser?: boolean;
}
