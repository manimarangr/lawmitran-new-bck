import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyMobileChangeDto {
  @ApiProperty({ example: '123456', description: '6-digit OTP sent to the new mobile' })
  @IsString()
  @Length(6, 6)
  code: string;
}
