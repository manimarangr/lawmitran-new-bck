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
  @IsIn(['rating', 'experience', 'createdAt'])
  sort?: 'rating' | 'experience' | 'createdAt';

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
