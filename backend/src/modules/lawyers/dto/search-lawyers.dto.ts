import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class SearchLawyersDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  practiceArea?: string;

  // Metro locality slug (e.g. "electronic-city"). Ranking boost, not a hard
  // filter — lawyers near the locality centroid sort first.
  @IsOptional()
  @IsString()
  locality?: string;

  // '1'/'true' -> only lawyers who can currently receive leads (subscription
  // ACTIVE or TRIAL). Used by the homepage showcase; normal search shows all.
  @IsOptional()
  @IsString()
  subscribed?: string;

  @IsOptional()
  @IsUUID()
  courtId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experienceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experienceMax?: number;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  ratingMin?: number;

  @IsOptional()
  @IsIn(['rating', 'experience', 'createdAt', 'distance'])
  sort?: 'rating' | 'experience' | 'createdAt' | 'distance';

  // Map bounding box — used by /markers endpoint
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  swLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  swLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  neLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  neLng?: number;

  // Point-radius "near me" search — client's current position.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  radiusKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;
}
