import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;

  /** reCAPTCHA token — only enforced when reCAPTCHA is enabled in admin settings. */
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
