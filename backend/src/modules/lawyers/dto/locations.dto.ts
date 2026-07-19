import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Matches,
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOfficeDto {
  @ApiProperty({ example: 'Bengaluru', description: 'City name from the reference list' })
  @IsString()
  @MinLength(2)
  city: string;

  @ApiPropertyOptional({ example: 'High Court chamber' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @ApiPropertyOptional({ example: '12, MG Road, 2nd floor' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine?: string;

  @ApiPropertyOptional({ example: '560001' })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Enter a valid 6-digit PIN code' })
  pincode?: string;

  @ApiPropertyOptional({ example: 'Opp. Metro station' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  landmark?: string;

  @ApiPropertyOptional({ description: 'Metro locality id (from GET /lawyers/localities)' })
  @IsOptional()
  @IsString()
  localityId?: string;

  @ApiPropertyOptional({ example: 12.9716 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}

export class UpdateOfficeDto extends PartialType(CreateOfficeDto) {
  @ApiPropertyOptional({ description: 'Make this the primary office (syncs profile city/coords)' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class SetServiceAreasDto {
  @ApiProperty({
    type: [String],
    example: ['Bengaluru', 'Mysuru', 'Tumakuru'],
    description: 'City names — replaces the current list; capped by the plan',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  cities: string[];
}
