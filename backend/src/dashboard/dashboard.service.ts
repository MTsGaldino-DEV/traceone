import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalEmployees,
      activeEmployees,
      totalItems,
      deliveriesThisMonth,
      returnsThisMonth,
      lossesThisMonth,
      lowStockItems,
      expiringItems,
      allocatedAssets,
      recentMovements,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { isActive: true } }),
      this.prisma.employee.count({ where: { isActive: true, status: 'ACTIVE' } }),
      this.prisma.item.count({ where: { isActive: true } }),
      this.prisma.stockMovement.count({
        where: { type: 'DELIVERY', createdAt: { gte: startOfMonth } },
      }),
      this.prisma.stockMovement.count({
        where: { type: 'RETURN', createdAt: { gte: startOfMonth } },
      }),
      this.prisma.stockMovement.count({
        where: { type: 'LOSS', createdAt: { gte: startOfMonth } },
      }),
      this.prisma.item.count({
        where: {
          isActive: true,
          type: 'CONSUMABLE',
          quantity: { lte: this.prisma.item.fields.minStock as any },
        },
      }).catch(() => 0),
      this.prisma.item.count({
        where: {
          isActive: true,
          expiresAt: { lte: thirtyDaysFromNow, gte: now },
        },
      }),
      this.prisma.item.count({
        where: { isActive: true, type: 'ASSET', currentHolderId: { not: null } },
      }),
      this.prisma.stockMovement.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          item: { select: { id: true, name: true, type: true } },
          employee: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    // Low stock — manual query since Prisma can't compare two fields natively
    const lowStockCount = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM items
      WHERE is_active = true AND type = 'CONSUMABLE' AND quantity <= min_stock
    `.then((r) => Number(r[0]?.count ?? 0)).catch(() => 0);

    return {
      totalEmployees,
      activeEmployees,
      totalItems,
      deliveriesThisMonth,
      returnsThisMonth,
      lossesThisMonth,
      lowStockItems: lowStockCount,
      expiringItems,
      allocatedAssets,
      recentMovements,
    };
  }
}
