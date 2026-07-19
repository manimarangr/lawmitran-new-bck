import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Comma-separated string (multipart) or array → trimmed string[] */
const toList = ({ value }: { value: unknown }): string[] =>
  Array.isArray(value)
    ? (value as string[])
    : String(value)
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

export class CreateLawyerProfileDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  barCouncilNumber: string;

  @IsString()
  barCouncilState: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'Pick at least 2 practice areas' })
  @IsString({ each: true })
  @Transform(toList)
  practiceAreas: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears: number;

  @IsString()
  city: string;

  // ---- work-related (onboarding v2) ----
  @IsString()
  @MinLength(50, { message: 'Bio must be at least 50 characters' })
  @MaxLength(1000)
  bio: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Pick at least one language' })
  @IsString({ each: true })
  @Transform(toList)
  languages: string[];

  @IsArray()
  @ArrayMinSize(1, { message: 'Pick at least one court' })
  @IsString({ each: true })
  @Transform(toList)
  courts: string[];

  // ---- office (docs/28) ----
  @IsString()
  @MinLength(5, { message: 'Enter the office address' })
  @MaxLength(200)
  addressLine: string;

  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Enter a valid 6-digit PIN code' })
  pincode: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  landmark?: string;

  @IsOptional()
  @IsString()
  localityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  officeLabel?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(6, { message: 'Pin the office location on the map' })
  @Max(37.5)
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(68)
  @Max(97.5)
  longitude: number;
}
