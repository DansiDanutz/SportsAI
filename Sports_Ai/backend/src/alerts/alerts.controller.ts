import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Header,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AlertsService, CreateAlertDto, UpdateAlertDto } from './alerts.service';

@Controller('v1/alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get()
  @Header('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  async getAll(@Request() req: any) {
    const alerts = await this.alertsService.findAllByUser(req.user.id);
    return {
      alerts: alerts.map((alert) => ({
        ...alert,
        conditions: JSON.parse(alert.conditions),
      })),
      total: alerts.length,
    };
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Request() req: any) {
    const alert = await this.alertsService.findById(id, req.user.id);
    return {
      alert: {
        ...alert,
        conditions: JSON.parse(alert.conditions),
      },
    };
  }

  @Post()
  async create(@Request() req: any, @Body() body: CreateAlertDto) {
    const alert = await this.alertsService.create(req.user.id, body);
    return {
      success: true,
      alert: {
        ...alert,
        conditions: JSON.parse(alert.conditions),
      },
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: UpdateAlertDto,
  ) {
    const alert = await this.alertsService.update(id, req.user.id, body);
    return {
      success: true,
      alert: {
        ...alert,
        conditions: JSON.parse(alert.conditions),
      },
    };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.alertsService.delete(id, req.user.id);
    return {
      success: true,
      message: 'Alert rule deleted',
    };
  }

  @Post(':id/toggle')
  async toggle(@Param('id') id: string, @Request() req: any) {
    const alert = await this.alertsService.toggle(id, req.user.id);
    return {
      success: true,
      alert: {
        ...alert,
        conditions: JSON.parse(alert.conditions),
      },
    };
  }

  @Post(':id/test')
  async testTrigger(@Param('id') id: string, @Request() req: any) {
    return this.alertsService.simulateTrigger(id, req.user.id);
  }
}
