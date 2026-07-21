import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;

  /** reCAPTCHA token — only enforced when reCAPTCHA is enabled in admin settings. */
  @IsOptional()
  @IsString()
  captchaToken?: string;
}

export class LoginTwoFaDto extends LoginDto {
  /** 6-digit code emailed to the admin */
  @IsString()
  @Length(6, 6)
  code: string;
}
