import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { Role } from '@prisma/client';

@Controller('items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemsController {
  constructor(
    private itemsService: ItemsService,
    private auditService: AuditService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.ALMOXARIFE)
  async create(@Body() dto: CreateItemDto, @CurrentUser() user: any) {
    const item = await this.itemsService.create(dto);
    await this.auditService.log({
      userId: user.id,
      action: 'CREATE',
      entity: 'item',
      entityId: item.id,
      details: { name: item.name, type: item.type },
    });
    return item;
  }

  @Get()
  @Roles(Role.ADMIN, Role.ALMOXARIFE, Role.GESTOR)
  findAll(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('lowStock') lowStock?: string,
  ) {
    return this.itemsService.findAll(search, type, categoryId, lowStock);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ALMOXARIFE, Role.GESTOR)
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ALMOXARIFE)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateItemDto>, @CurrentUser() user: any) {
    const item = await this.itemsService.update(id, dto);
    await this.auditService.log({
      userId: user.id,
      action: 'UPDATE',
      entity: 'item',
      entityId: id,
      details: dto,
    });
    return item;
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.itemsService.remove(id);
    await this.auditService.log({
      userId: user.id,
      action: 'DELETE',
      entity: 'item',
      entityId: id,
    });
    return result;
  }
}
