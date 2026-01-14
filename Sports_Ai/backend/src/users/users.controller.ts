import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, Request, HttpCode, HttpStatus, BadRequestException, NotFoundException, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UploadsService } from '../uploads/uploads.service';
import { IsIn, IsString } from 'class-validator';
import { FastifyRequest } from 'fastify';

class UpgradeSubscriptionDto {
  @IsString()
  @IsIn(['premium', 'free'])
  tier!: 'premium' | 'free';
}

class CancelSubscriptionDto {
  @IsString()
  reason!: string;
}

@Controller('v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private uploadsService: UploadsService,
  ) {}

  @Get('me')
  async getProfile(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    return {
      id: user?.id,
      email: user?.email,
      subscriptionTier: user?.subscriptionTier,
      creditBalance: user?.creditBalance,
      profilePictureUrl: user?.profilePictureUrl,
      createdAt: user?.createdAt,
    };
  }

  @Post('me/profile-picture')
  @HttpCode(HttpStatus.OK)
  async uploadProfilePicture(
    @Request() req: any,
    @Req() fastifyReq: FastifyRequest,
  ) {
    // Parse multipart file from Fastify request
    const data = await (fastifyReq as any).file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    // Read file buffer
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const file = {
      buffer,
      mimetype: data.mimetype,
      originalname: data.filename,
      size: buffer.length,
    };

    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old profile picture if exists
    if (user.profilePictureUrl) {
      await this.uploadsService.deleteFile(user.profilePictureUrl);
    }

    // Save new profile picture
    const profilePictureUrl = await this.uploadsService.saveProfilePicture(
      file,
      req.user.id,
    );

    // Update user record
    await this.usersService.updateProfilePicture(req.user.id, profilePictureUrl);

    return {
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePictureUrl,
    };
  }

  @Delete('me/profile-picture')
  @HttpCode(HttpStatus.OK)
  async deleteProfilePicture(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profilePictureUrl) {
      return {
        success: false,
        message: 'No profile picture to delete',
      };
    }

    // Delete the file
    await this.uploadsService.deleteFile(user.profilePictureUrl);

    // Clear the URL in database
    await this.usersService.updateProfilePicture(req.user.id, null);

    return {
      success: true,
      message: 'Profile picture deleted successfully',
    };
  }

  @Get('me/favorites')
  async getFavorites() {
    // Favorites are managed via the dedicated /v1/favorites endpoints.
    return {
      favorites: [],
      total: 0,
    };
  }

  @Get('me/preferences')
  async getPreferences(@Request() req: any) {
    const preferences = await this.usersService.getPreferences(req.user.id);
    return preferences;
  }

  @Patch('me/preferences')
  async updatePreferences(@Request() req: any, @Body() body: any) {
    const preferences = await this.usersService.updatePreferences(req.user.id, body);
    return {
      success: true,
      message: 'Preferences updated',
      preferences,
    };
  }

  @Post('me/subscription/upgrade')
  @HttpCode(HttpStatus.OK)
  async upgradeSubscription(@Request() req: any, @Body() body: UpgradeSubscriptionDto) {
    const updatedUser = await this.usersService.updateSubscription(req.user.id, body.tier);

    // In production, this would integrate with Stripe/payment processor
    // For now, we simulate the upgrade immediately
    return {
      success: true,
      message: body.tier === 'premium'
        ? 'Successfully upgraded to Premium!'
        : 'Subscription changed to Free tier',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        subscriptionTier: updatedUser.subscriptionTier,
        creditBalance: updatedUser.creditBalance,
      },
    };
  }

  @Get('me/subscription')
  async getSubscription(@Request() req: any) {
    const user = await this.usersService.findById(req.user.id);
    const cancellation = this.usersService.getCancellationStatus(req.user.id);
    return {
      tier: user?.subscriptionTier || 'free',
      features: user?.subscriptionTier === 'premium'
        ? ['arbitrage_full_details', 'line_movement', 'ai_insights', 'priority_support']
        : ['basic_arbitrage', 'limited_events'],
      cancellation: cancellation || null,
    };
  }

  @Post('me/subscription/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@Request() req: any, @Body() body: CancelSubscriptionDto) {
    const user = await this.usersService.findById(req.user.id);

    if (!user || user.subscriptionTier === 'free') {
      return {
        success: false,
        message: 'No active subscription to cancel',
      };
    }

    const cancellation = await this.usersService.cancelSubscription(req.user.id, body.reason);

    return {
      success: true,
      message: 'Subscription cancelled successfully. Your premium access will continue until the end of your billing period.',
      cancellation,
    };
  }

  @Post('me/export')
  @HttpCode(HttpStatus.OK)
  async requestDataExport(@Request() req: any) {
    const result = await this.usersService.requestDataExport(req.user.id);
    return result;
  }

  @Get('me/export/status')
  async getExportStatus(@Request() req: any) {
    const status = await this.usersService.getExportStatus(req.user.id);
    return status;
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Request() req: any) {
    const result = await this.usersService.deleteUser(req.user.id);
    return result;
  }

  // Sport-specific settings
  @Get('me/settings/sports/:sportKey')
  async getSportSettings(@Request() req: any, @Param('sportKey') sportKey: string) {
    const settings = await this.usersService.getSportSettings(req.user.id, sportKey);
    return { settings };
  }

  @Put('me/settings/sports/:sportKey')
  @HttpCode(HttpStatus.OK)
  async updateSportSettings(
    @Request() req: any,
    @Param('sportKey') sportKey: string,
    @Body() body: {
      enabledMarkets: string[];
      preferredPeriod: string;
      showLiveOnly: boolean;
      minOdds: number;
      maxOdds: number;
      defaultStake: number;
    },
  ) {
    const settings = await this.usersService.updateSportSettings(req.user.id, sportKey, body);
    return { success: true, settings };
  }
}
