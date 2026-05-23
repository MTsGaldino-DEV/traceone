import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { EmployeeStatus } from '@prisma/client';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Matrícula é obrigatória' })
  registration: string;

  @IsString()
  @IsNotEmpty({ message: 'Cargo é obrigatório' })
  jobTitle: string;

  @IsString()
  @IsNotEmpty({ message: 'Setor é obrigatório' })
  sector: string;

  @IsString()
  @IsNotEmpty({ message: 'Unidade é obrigatória' })
  unit: string;

  @IsEnum(EmployeeStatus)
  @IsOptional()
  status?: EmployeeStatus;
}
