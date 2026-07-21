import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const CONTACT_CATEGORIES = [
  'PAYMENT_ISSUE',
  'ID_CARD_UPLOAD_ISSUE',
  'ACCOUNT_ISSUE',
  'SUBSCRIPTION_ISSUE',
  'LEAD_ISSUE',
  'VERIFICATION_ISSUE',
  'TECHNICAL_ISSUE',
  'OTHER',
] as const;
export type ContactCategoryValue = (typeof CONTACT_CATEGORIES)[number];

export class CreateContactQueryDto {
  @ApiProperty({ example: 'R. Kumar' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'you@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiProperty({ enum: CONTACT_CATEGORIES, example: 'PAYMENT_ISSUE' })
  @IsIn(CONTACT_CATEGORIES)
  category: ContactCategoryValue;

  @ApiPropertyOptional({ example: 'Charged twice for Premium' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;

  @ApiProperty({
    description: 'The query itself',
    example: 'I paid for the Premium plan but…',
  })
  @IsString()
  @MinLength(20)
  @MaxLength(3000)
  message: string;
}
