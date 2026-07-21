import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class AdminCreateUserDto {
  @ApiProperty({ example: 'R. Kumar' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'kumar@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(/^\+?\d{10,14}$/, { message: 'Enter a valid mobile number' })
  mobile: string;

  @ApiProperty({ enum: ['CLIENT', 'LAWYER', 'ADMIN'], example: 'CLIENT' })
  @IsIn(['CLIENT', 'LAWYER', 'ADMIN'], {
    message: 'Role must be CLIENT, LAWYER, or ADMIN',
  })
  role: 'CLIENT' | 'LAWYER' | 'ADMIN';

  @ApiPropertyOptional({
    enum: ['SUPER', 'OPS', 'FINANCE'],
    description: 'Staff role — only when role=ADMIN (SUPER admins only)',
  })
  @IsOptional()
  @IsIn(['SUPER', 'OPS', 'FINANCE'])
  adminRole?: 'SUPER' | 'OPS' | 'FINANCE';

  @ApiPropertyOptional({
    description: 'Omit to auto-generate a temporary password',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

export class AdminUpdateUserDto extends PartialType(
  PickType(AdminCreateUserDto, ['fullName', 'email', 'mobile'] as const),
) {}
