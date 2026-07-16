import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PreviewDto {
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}

export class PrefillDto {
  @IsString()
  @MinLength(10)
  @MaxLength(800)
  context: string;
}

export class CheckoutDto {
  @IsString()
  templateId: string;

  @IsObject()
  input: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  state?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  declaredValue?: number;
}

export class QuoteDto {
  @IsString()
  templateId: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  state?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  declaredValue?: number;
}

export class VerifyDocPaymentDto {
  @IsString()
  customerDocumentId: string;

  @IsString()
  razorpayOrderId: string;

  @IsString()
  razorpayPaymentId: string;

  @IsString()
  razorpaySignature: string;
}

export class AdminCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;
}

export class AdminTemplateDto {
  @IsString()
  categoryId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  requiresStamp?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  stampBasis?: string;

  @IsObject()
  schemaJson: Record<string, unknown>;

  @IsString()
  @MinLength(20)
  bodyTemplate: string;
}

export class AdminUpdateTemplateDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  requiresStamp?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  stampBasis?: string;

  @IsOptional()
  @IsObject()
  schemaJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MinLength(20)
  bodyTemplate?: string;
}

export class SetTemplateStatusDto {
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status: string;
}

export class StampDutyUpsertDto {
  @IsString()
  @MaxLength(4)
  state: string;

  @IsString()
  @MaxLength(60)
  documentType: string;

  @IsIn(['FLAT', 'PERCENT', 'SLAB'])
  calcType: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  flatAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  percent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class StampDutyUpdateDto {
  @IsOptional()
  @IsIn(['FLAT', 'PERCENT', 'SLAB'])
  calcType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  flatAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  percent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ReviewPaymentDto {
  @IsString()
  razorpayOrderId: string;

  @IsString()
  razorpayPaymentId: string;

  @IsString()
  razorpaySignature: string;
}

export class ReviewDecisionDto {
  @IsIn(['APPROVED', 'REJECTED', 'REVISION'])
  decision: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
