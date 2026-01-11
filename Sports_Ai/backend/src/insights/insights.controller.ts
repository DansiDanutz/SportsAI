import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IsString, IsIn } from 'class-validator';
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
    // Record feedback in database
    // For now, just log it (in production, store in InsightFeedback table)
    console.log(`Feedback received from user ${req.user.id}:`, {
      eventId: body.eventId,
      feedbackType: body.feedbackType,
      insightType: body.insightType,
    });

    return {
      success: true,
      message: 'Feedback recorded successfully',
    };
  }
}
