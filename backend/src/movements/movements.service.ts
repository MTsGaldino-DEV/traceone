import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementType, ItemType } from '@prisma/client';

@Injectable()
export class MovementsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateMovementDto, userId: string) {
    // Load item
    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, isActive: true },
      include: { currentHolder: true },
    });
    if (!item) throw new NotFoundException('Item não encontrado');

    // Load employee if provided
    let employee: any = null;
    if (dto.employeeId) {
      employee = await this.prisma.employee.findFirst({
        where: { id: dto.employeeId, isActive: true },
      });
      if (!employee) throw new NotFoundException('Colaborador não encontrado');
    }

    // Business rules per movement type
    await this.validateMovement(dto, item, employee);

    // Run in transaction: create movement + update item stock/holder
    const movement = await this.prisma.$transaction(async (tx) => {
      // Create movement record
      const mov = await tx.stockMovement.create({
        data: {
          type: dto.type,
          itemId: dto.itemId,
          employeeId: dto.employeeId ?? null,
          userId,
          quantity: dto.quantity,
          notes: dto.notes,
          itemName: item.name,
          employeeName: employee?.name ?? null,
          employeeRegistration: employee?.registration ?? null,
        },
      });

      // Update item based on type
      if (item.type === ItemType.CONSUMABLE) {
        const delta = this.getStockDelta(dto.type, dto.quantity);
        const newQty = item.quantity + delta;
        if (newQty < 0)
          throw new BadRequestException(
            `Estoque insuficiente. Disponível: ${item.quantity}`,
          );
        await tx.item.update({
          where: { id: item.id },
          data: { quantity: newQty },
        });
      } else {
        // ASSET: update currentHolder
        const newHolderId = this.getAssetHolder(dto.type, dto.employeeId, item);
        await tx.item.update({
          where: { id: item.id },
          data: { currentHolderId: newHolderId },
        });
      }

      return mov;
    });

    // Audit
    const auditAction = this.getAuditAction(dto.type);
    await this.auditService.log({
      userId,
      action: auditAction,
      entity: 'movement',
      entityId: movement.id,
      details: {
        itemName: item.name,
        employeeName: employee?.name,
        type: dto.type,
        quantity: dto.quantity,
      },
    });

    // Return with relations
    return this.prisma.stockMovement.findUnique({
      where: { id: movement.id },
      include: {
        item: { select: { id: true, name: true, type: true } },
        employee: { select: { id: true, name: true, registration: true } },
        user: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(
    page = 1,
    limit = 50,
    type?: string,
    itemId?: string,
    employeeId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (type) where.type = type;
    if (itemId) where.itemId = itemId;
    if (employeeId) where.employeeId = employeeId;

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { id: true, name: true, type: true, patrimonyCode: true } },
          employee: { select: { id: true, name: true, registration: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async validateMovement(dto: CreateMovementDto, item: any, employee: any) {
    const { type } = dto;

    if (
      (type === MovementType.DELIVERY || type === MovementType.REPLACEMENT) &&
      !dto.employeeId
    ) {
      throw new BadRequestException('Colaborador obrigatório para entrega');
    }

    if (type === MovementType.RETURN && !dto.employeeId) {
      throw new BadRequestException('Colaborador obrigatório para devolução');
    }

    if (item.type === ItemType.ASSET) {
      if (type === MovementType.DELIVERY && item.currentHolderId) {
        throw new BadRequestException(
          'Patrimônio já está alocado. Registre uma devolução primeiro.',
        );
      }
      if (
        type === MovementType.RETURN &&
        item.currentHolderId !== dto.employeeId
      ) {
        throw new BadRequestException(
          'Este patrimônio não está alocado para o colaborador informado',
        );
      }
    }
  }

  private getStockDelta(type: MovementType, quantity: number): number {
    switch (type) {
      case MovementType.DELIVERY:
      case MovementType.LOSS:
      case MovementType.WRITEOFF:
        return -quantity;
      case MovementType.RETURN:
        return +quantity;
      case MovementType.REPLACEMENT:
        return 0; // replacement is handled separately (return + delivery)
      default:
        return 0;
    }
  }

  private getAssetHolder(
    type: MovementType,
    employeeId: string | undefined,
    item: any,
  ): string | null {
    switch (type) {
      case MovementType.DELIVERY:
        return employeeId ?? null;
      case MovementType.RETURN:
      case MovementType.LOSS:
      case MovementType.WRITEOFF:
        return null;
      default:
        return item.currentHolderId;
    }
  }

  private getAuditAction(type: MovementType) {
    switch (type) {
      case MovementType.DELIVERY:
        return 'DELIVERY' as any;
      case MovementType.RETURN:
        return 'RETURN' as any;
      case MovementType.LOSS:
        return 'LOSS' as any;
      default:
        return 'CREATE' as any;
    }
  }
}
