import { Controller, Get, Post, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SmartAlertsService } from './smart-alerts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('alerts')
@Controller('v1/alerts')
export class AlertsController {
  constructor(private readonly smartAlertsService: SmartAlertsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user alerts' })
  @ApiResponse({ status: 200, description: 'List of user alerts' })
  async getUserAlerts(
    @Request() req: any,
    @Query('limit') limit?: string
  ) {
    const userId = req.user?.id || 'anonymous';
    const alertLimit = limit ? parseInt(limit, 10) : 20;
    
    const alerts = await this.smartAlertsService.getAlertsForUser(userId, alertLimit);
    
    return {
      status: 'success',
      data: alerts,
      meta: {
        count: alerts.length,
        userId
      }
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get alert statistics' })
  @ApiResponse({ status: 200, description: 'Alert statistics' })
  async getAlertStats() {
    const stats = await this.smartAlertsService.getAlertStats();
    
    return {
      status: 'success',
      data: stats
    };
  }

  @Patch(':alertId/read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark alert as read' })
  @ApiResponse({ status: 200, description: 'Alert marked as read' })
  async markAlertAsRead(
    @Param('alertId') alertId: string,
    @Request() req: any
  ) {
    const userId = req.user?.id || 'anonymous';
    const success = await this.smartAlertsService.markAlertAsRead(alertId, userId);
    
    return {
      status: success ? 'success' : 'error',
      message: success ? 'Alert marked as read' : 'Failed to mark alert as read'
    };
  }

  @Post('check')
  @ApiOperation({ summary: 'Manually trigger alerts check' })
  @ApiResponse({ status: 200, description: 'Alerts check completed' })
  async manualAlertsCheck() {
    try {
      await this.smartAlertsService.checkForAlerts();
      
      return {
        status: 'success',
        message: 'Alerts check completed successfully'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Smart alerts service health check' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async healthCheck() {
    const health = await this.smartAlertsService.healthCheck();
    
    return {
      status: 'success',
      data: health
    };
  }
}