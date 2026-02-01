import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { ClientsService } from '../services/clients.service';
import { CreateClientDto, UpdateClientDto } from '../entities/client.entity';

@Controller('clients')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Post()
  async create(@Request() req: any, @Body() dto: CreateClientDto) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'user-1';
    return this.clientsService.create(tenantId, userId, dto);
  }

  @Get()
  async findAll(
    @Request() req: any,
    @Query('status') status?: 'active' | 'inactive',
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'name' | 'recent' | 'orders' | 'revenue',
  ) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'user-1';
    return this.clientsService.findAll(tenantId, userId, { status, search, sortBy });
  }

  @Get('upcoming-dates')
  async getUpcomingDates(
    @Request() req: any,
    @Query('days') days: number = 30,
  ) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'user-1';
    return this.clientsService.getUpcomingDates(tenantId, userId, days);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'user-1';
    return this.clientsService.findOne(tenantId, userId, id);
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'user-1';
    return this.clientsService.update(tenantId, userId, id, dto);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'user-1';
    return this.clientsService.delete(tenantId, userId, id);
  }
}
