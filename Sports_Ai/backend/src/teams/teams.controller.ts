import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamsService } from './teams.service';

@Controller('v1/teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.teamsService.findById(id);
  }

  @Get(':id/fixtures')
  async getFixtures(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const fixtures = await this.teamsService.getFixtures(
      id,
      limit ? parseInt(limit, 10) : 10,
    );
    return {
      fixtures,
      total: fixtures.length,
    };
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.teamsService.getStats(id);
  }
}
