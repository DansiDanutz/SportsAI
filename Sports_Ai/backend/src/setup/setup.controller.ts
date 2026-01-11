import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SetupService } from './setup.service';

interface CreateConfigDto {
  name: string;
  sportKey: string;
  leagues?: string[];
  countries?: string[];
  markets?: string[];
  isActive?: boolean;
}

interface UpdateConfigDto {
  name?: string;
  sportKey?: string;
  leagues?: string[];
  countries?: string[];
  markets?: string[];
  isActive?: boolean;
}

@Controller('v1/setup')
@UseGuards(JwtAuthGuard)
export class SetupController {
  constructor(private setupService: SetupService) {}

  @Get('configurations')
  async getConfigurations(@Request() req: { user: { id: string } }) {
    const configurations = await this.setupService.getConfigurations(req.user.id);
    return { configurations };
  }

  @Get('configurations/active')
  async getActiveConfiguration(@Request() req: { user: { id: string } }) {
    const configuration = await this.setupService.getActiveConfiguration(req.user.id);
    return { configuration };
  }

  @Post('configurations')
  async createConfiguration(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateConfigDto,
  ) {
    if (!dto.name || dto.name.trim().length < 3) {
      throw new HttpException(
        'Configuration name must be at least 3 characters',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!dto.sportKey) {
      throw new HttpException('Sport is required', HttpStatus.BAD_REQUEST);
    }

    const configuration = await this.setupService.createConfiguration(
      req.user.id,
      {
        name: dto.name.trim(),
        sportKey: dto.sportKey,
        leagues: dto.leagues || [],
        countries: dto.countries || [],
        markets: dto.markets || [],
        isActive: dto.isActive || false,
      },
    );

    return { success: true, configuration };
  }

  @Put('configurations/:id')
  async updateConfiguration(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateConfigDto,
  ) {
    try {
      const configuration = await this.setupService.updateConfiguration(
        req.user.id,
        id,
        dto,
      );
      return { success: true, configuration };
    } catch (error) {
      if (error instanceof Error && error.message === 'Configuration not found') {
        throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }

  @Delete('configurations/:id')
  async deleteConfiguration(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    try {
      await this.setupService.deleteConfiguration(req.user.id, id);
      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.message === 'Configuration not found') {
        throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }

  @Post('configurations/:id/activate')
  async activateConfiguration(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    try {
      const configuration = await this.setupService.activateConfiguration(
        req.user.id,
        id,
      );
      return { success: true, configuration };
    } catch (error) {
      if (error instanceof Error && error.message === 'Configuration not found') {
        throw new HttpException('Configuration not found', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }

  @Get('ai-insights')
  async getAiInsights(@Request() req: { user: { id: string } }) {
    const insights = await this.setupService.getAiMatchInsights(req.user.id);
    return { insights };
  }

  @Get('leagues')
  async getLeagues(@Query('sport') sportKey: string) {
    if (!sportKey) {
      throw new HttpException('Sport key is required', HttpStatus.BAD_REQUEST);
    }
    const leagues = await this.setupService.getAvailableLeagues(sportKey);
    return { leagues };
  }

  @Get('countries')
  async getCountries(@Query('sport') sportKey: string) {
    if (!sportKey) {
      throw new HttpException('Sport key is required', HttpStatus.BAD_REQUEST);
    }
    const countries = await this.setupService.getAvailableCountries(sportKey);
    return { countries };
  }

  @Get('markets')
  async getMarkets(@Query('sport') sportKey: string) {
    if (!sportKey) {
      throw new HttpException('Sport key is required', HttpStatus.BAD_REQUEST);
    }
    const markets = this.setupService.getAvailableMarkets(sportKey);
    return { markets };
  }
}
