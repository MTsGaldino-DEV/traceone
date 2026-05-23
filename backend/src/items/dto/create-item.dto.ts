import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsDateString, Min,
} from 'class-validator';
import { ItemType, ItemStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome do item é obrigatório' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ItemType, { message: 'Tipo deve ser CONSUMABLE ou ASSET' })
  type: ItemType;

  @IsString()
  @IsNotEmpty({ message: 'Categoria é obrigatória' })
  categoryId: string;

  // Consumable
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minStock?: number;

  @IsString()
  @IsOptional()
  lotNumber?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  // Asset
  @IsString()
  @IsOptional()
  patrimonyCode?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsEnum(ItemStatus)
  @IsOptional()
  status?: ItemStatus;
}
