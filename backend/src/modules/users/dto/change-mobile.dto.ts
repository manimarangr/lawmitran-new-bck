import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangeMobileDto {
  @ApiProperty({
    example: '9812345678',
    description: 'New mobile number (OTP will be sent)',
  })
  @IsString()
  @MinLength(10)
  mobile: string;
}
