import UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private usersService: UsersService) { }
{ Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { 
  @Post()
create(@Body() dto: CreateUserDto) {
  return this.usersService.create(dto);
}

@Get()
findAll() {
  return this.usersService.findAll();
}

@Get(':id')
findOne(@Param('id') id: string) {
  return this.usersService.findOne(id);
}

@Patch(':id')
update(@Param('id') id: string, @Body() dto: Partial<CreateUserDto>) {
  return this.usersService.update(id, dto);
}

@Delete(':id')
remove(@Param('id') id: string) {
  return this.usersService.remove(id);
}
}
