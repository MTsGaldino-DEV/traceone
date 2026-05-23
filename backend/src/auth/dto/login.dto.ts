import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @IsNotEmpty({ message: 'Senha obrigatória' })
  @IsString()
  @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres' })
  password: string;
}
