import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { Role } from '@prisma/client';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(
    private employeesService: EmployeesService,
    private auditService: AuditService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.ALMOXARIFE)
  async create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: any) {
    const employee = await this.employeesService.create(dto);
    await this.auditService.log({
      userId: user.id,
      action: 'CREATE',
      entity: 'employee',
      entityId: employee.id,
      details: { name: employee.name, registration: employee.registration },
    });
    return employee;
  }

  @Get()
  @Roles(Role.ADMIN, Role.ALMOXARIFE, Role.GESTOR)
  findAll(
    @Query('search') search?: string,
    @Query('sector') sector?: string,
    @Query('status') status?: string,
  ) {
    return this.employeesService.findAll(search, sector, status);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ALMOXARIFE, Role.GESTOR)
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Get(':id/history')
  @Roles(Role.ADMIN, Role.ALMOXARIFE, Role.GESTOR)
  getHistory(@Param('id') id: string) {
    return this.employeesService.getHistory(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ALMOXARIFE)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateEmployeeDto>, @CurrentUser() user: any) {
    const employee = await this.employeesService.update(id, dto);
    await this.auditService.log({
      userId: user.id,
      action: 'UPDATE',
      entity: 'employee',
      entityId: id,
      details: dto,
    });
    return employee;
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.employeesService.remove(id);
    await this.auditService.log({
      userId: user.id,
      action: 'DELETE',
      entity: 'employee',
      entityId: id,
    });
    return result;
  }
}
