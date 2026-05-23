import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

interface LogParams {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ip?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: LogParams) {
    return this.prisma.audit.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details ?? {},
        ip: params.ip,
      },
    });
  }

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.audit.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.prisma.audit.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
