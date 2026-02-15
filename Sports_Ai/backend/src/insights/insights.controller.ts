import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IsString, IsIn, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

class InsightFeedbackDto {
  @IsString()
  eventId!: string;

  @IsIn(['helpful', 'not_helpful'])
  feedbackType!: 'helpful' | 'not_helpful';

  @IsString()
  insightType!: string;
}

@Controller('v1/insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private prisma: PrismaService) {}

  @Post('feedback')
  async submitFeedback(@Request() req: any, @Body() body: InsightFeedbackDto) {
    const feedback = await this.prisma.insightFeedback.upsert({
      where: {
        userId_eventId_insightType: {
          userId: req.user.id,
          eventId: body.eventId,
          insightType: body.insightType,
        },
      },
      update: {
        feedbackType: body.feedbackType,
      },
      create: {
        userId: req.user.id,
        eventId: body.eventId,
        insightType: body.insightType,
        feedbackType: body.feedbackType,
      },
    });

    return {
      success: true,
      message: 'Feedback recorded successfully',
      id: feedback.id,
    };
  }

  @Get('feedback/stats')
  async getFeedbackStats(@Query('insightType') insightType?: string) {
    const where = insightType ? { insightType } : {};

    const [helpful, notHelpful] = await Promise.all([
      this.prisma.insightFeedback.count({
        where: { ...where, feedbackType: 'helpful' },
      }),
      this.prisma.insightFeedback.count({
        where: { ...where, feedbackType: 'not_helpful' },
      }),
    ]);

    const total = helpful + notHelpful;
    return {
      helpful,
      notHelpful,
      total,
      helpfulRate: total > 0 ? Math.round((helpful / total) * 100) : 0,
    };
  }

  @Get('feedback/my')
  async getMyFeedback(@Request() req: any) {
    const feedbacks = await this.prisma.insightFeedback.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { feedbacks };
  }
}
