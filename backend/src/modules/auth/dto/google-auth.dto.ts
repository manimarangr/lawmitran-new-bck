import { IsString, MinLength } from 'class-validator';

export class GoogleAuthDto {
  /** Google Identity Services ID token (JWT credential from the GIS button). */
  @IsString()
  @MinLength(20)
  credential: string;
}
