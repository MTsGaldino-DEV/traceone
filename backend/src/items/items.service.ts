import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateItemDto) {
    // Validate patrimony uniqueness for ASSET
    if (dto.type === 'ASSET' && dto.patrimonyCode) {
      const existing = await this.prisma.item.findUnique({
        where: { patrimonyCode: dto.patrimonyCode },
      });
      if (existing) throw new ConflictException('Código de patrimônio já cadastrado');
    }

    return this.prisma.item.create({
      data: {
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        quantity: dto.type === 'CONSUMABLE' ? (dto.quantity ?? 0) : 0,
      },
      include: { category: true },
    });
  }

  async findAll(search?: string, type?: string, categoryId?: string, lowStock?: string) {
    const where: any = { isActive: true };
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { patrimonyCode: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.item.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        category: { select: { id: true, name: true } },
        currentHolder: { select: { id: true, name: true, registration: true } },
      },
    });

    if (lowStock === 'true') {
      return items.filter(
        (i) => i.type === 'CONSUMABLE' && i.quantity <= i.minStock,
      );
    }

    return items;
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, isActive: true },
      include: {
        category: true,
        currentHolder: { select: { id: true, name: true, registration: true, sector: true } },
        movements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            employee: { select: { id: true, name: true, registration: true } },
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Item não encontrado');
    return item;
  }

  async update(id: string, dto: Partial<CreateItemDto>) {
    await this.findOne(id);
    return this.prisma.item.update({
      where: { id },
      data: {
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.item.update({
      where: { id },
      data: { isActive: false, status: 'INACTIVE' },
    });
  }

  // Called by MovementsService to adjust stock
  async adjustStock(id: string, delta: number) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item não encontrado');
    if (item.type !== 'CONSUMABLE') throw new BadRequestException('Item não é consumível');
    const newQty = item.quantity + delta;
    if (newQty < 0) throw new BadRequestException('Estoque insuficiente');
    return this.prisma.item.update({ where: { id }, data: { quantity: newQty } });
  }
}
