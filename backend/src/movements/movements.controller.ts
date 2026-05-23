import {
  Controller, Get, Post, Body, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('movements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovementsController {
  constructor(private movementsService: MovementsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.ALMOXARIFE)
  create(@Body() dto: CreateMovementDto, @CurrentUser() user: any) {
    return this.movementsService.create(dto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ALMOXARIFE, Role.GESTOR)
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('type') type?: string,
    @Query('itemId') itemId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.movementsService.findAll(page, limit, type, itemId, employeeId);
  }
}
