import {
  IsString, IsOptional, IsEnum, IsInt, IsNotEmpty, Min,
} from 'class-validator';
import { MovementType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateMovementDto {
  @IsEnum(MovementType, { message: 'Tipo de movimentação inválido' })
  type: MovementType;

  @IsString()
  @IsNotEmpty({ message: 'Item é obrigatório' })
  itemId: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
