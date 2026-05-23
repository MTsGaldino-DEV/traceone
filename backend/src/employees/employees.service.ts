import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { registration: dto.registration },
    });
    if (existing) throw new ConflictException('Matrícula já cadastrada');

    return this.prisma.employee.create({ data: dto });
  }

  async findAll(search?: string, sector?: string, status?: string) {
    return this.prisma.employee.findMany({
      where: {
        isActive: true,
        ...(status && { status: status as any }),
        ...(sector && { sector }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { registration: { contains: search, mode: 'insensitive' } },
            { sector: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
      include: {
        assets: {
          where: { isActive: true },
          select: { id: true, name: true, patrimonyCode: true, serialNumber: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, isActive: true },
      include: {
        assets: {
          where: { isActive: true },
          select: { id: true, name: true, patrimonyCode: true, serialNumber: true, type: true },
        },
      },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado');
    return employee;
  }

  async getHistory(id: string) {
    await this.findOne(id);
    return this.prisma.stockMovement.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { id: true, name: true, type: true, patrimonyCode: true } },
        user: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: Partial<CreateEmployeeDto>) {
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false, status: 'INACTIVE' },
    });
  }
}
