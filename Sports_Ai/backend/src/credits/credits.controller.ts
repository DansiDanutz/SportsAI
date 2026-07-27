import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Request, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreditsService } from './credits.service';
import { IsString, IsNumber, Min } from 'class-validator';

class UnlockOpportunityDto {
  @IsString()
  opportunityId!: string;
}

class PurchaseCreditsDto {
  @IsNumber()
  @Min(1)
  credits!: number;

  @IsNumber()
  @Min(0)
  price!: number;
}

@Controller('v1/credits')
@UseGuards(JwtAuthGuard)
export class CreditsController {
  constructor(private creditsService: CreditsService) {}

  @Get('balance')
  async getBalance(@Request() req: any) {
    const balance = await this.creditsService.getBalance(req.user.id);
    return {
      balance,
      lastUpdated: new Date().toISOString(),
    };
  }

  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  async unlockOpportunity(@Request() req: any, @Body() body: UnlockOpportunityDto) {
    try {
      const result = await this.creditsService.unlockOpportunity(
        req.user.id,
        body.opportunityId,
        10,
      );
      return result;
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        // Re-throw with the original error data
        throw error;
      }
      throw new BadRequestException('Failed to unlock opportunity');
    }
  }

  @Post('purchase')
  @HttpCode(HttpStatus.OK)
  async purchaseCredits(@Request() _req: any, @Body() _body: PurchaseCreditsDto) {
    throw new ServiceUnavailableException(
      'Credit purchases are disabled until a verified payment provider is configured',
    );
  }

  @Get('history')
  async getHistory(@Request() req: any) {
    const transactions = await this.creditsService.getTransactionHistory(req.user.id);
    return { transactions };
  }

  @Get('unlocked')
  async getUnlockedOpportunities(@Request() req: any) {
    const unlocked = await this.creditsService.getUnlockedOpportunities(req.user.id);
    return { unlocked };
  }
}
