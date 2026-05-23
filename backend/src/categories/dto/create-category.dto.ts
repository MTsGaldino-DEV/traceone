import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome da categoria é obrigatório' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
