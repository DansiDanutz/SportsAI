import { Controller, Get, Post, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard, RequireAdmin } from '../auth/admin.guard';
import { AdminService } from './admin.service';

@Controller('v1/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@RequireAdmin()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('env-status')
  async getEnvStatus() {
    return this.adminService.getEnvStatus();
  }

  @Get('users')
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Post('users/:id/role')
  @HttpCode(HttpStatus.OK)
  async updateUserRole(
    @Param('id') userId: string,
    @Body() body: { role: string },
  ) {
    return this.adminService.updateUserRole(userId, body.role);
  }

  @Post('users/:id/subscription')
  @HttpCode(HttpStatus.OK)
  async updateUserSubscription(
    @Param('id') userId: string,
    @Body() body: { tier: string },
  ) {
    return this.adminService.updateUserSubscription(userId, body.tier);
  }

  @Post('seed-data')
  @HttpCode(HttpStatus.OK)
  async seedData() {
    return this.adminService.seedDemoData();
  }
}
