import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Categoria já cadastrada');
    return this.prisma.category.create({ data: dto });
  }

  async findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, isActive: true } });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
    return cat;
  }

  async update(id: string, dto: Partial<CreateCategoryDto>) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }
}
