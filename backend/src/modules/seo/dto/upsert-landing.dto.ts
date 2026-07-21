import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertLandingDto {
  @ApiProperty({ example: 'Family Lawyers in Bengaluru' })
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty({
    description: 'Unique SEO intro copy for this city × practice page',
  })
  @IsString()
  @MaxLength(2000)
  intro: string;

  @ApiPropertyOptional({
    description: 'FAQ entries [{ q, a }]',
    example: [{ q: 'How much do they charge?', a: 'Fees are indicative…' }],
  })
  @IsOptional()
  @IsArray()
  faq?: { q: string; a: string }[];
}
