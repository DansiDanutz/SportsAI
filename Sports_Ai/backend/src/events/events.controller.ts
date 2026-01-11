import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EventsService } from './events.service';

@Controller('v1/events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
  async getAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('sport') sport?: string,
    @Query('favoritesOnly') favoritesOnly?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const events = await this.eventsService.findAll({
      status,
      sportKey: sport,
      favoritesOnly: favoritesOnly === 'true',
      userId: req.user.id,
      limit: limit ? parseInt(limit, 10) : 50,
      search,
    });

    return {
      events,
      total: events.length,
    };
  }

  @Get('live')
  async getLive(
    @Request() req: any,
    @Query('favoritesOnly') favoritesOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const events = await this.eventsService.getLiveEvents({
      favoritesOnly: favoritesOnly === 'true',
      userId: req.user.id,
      limit: limit ? parseInt(limit, 10) : 10,
    });

    return {
      events,
      total: events.length,
    };
  }

  @Get('upcoming')
  async getUpcoming(
    @Request() req: any,
    @Query('favoritesOnly') favoritesOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const events = await this.eventsService.getUpcomingEvents({
      favoritesOnly: favoritesOnly === 'true',
      userId: req.user.id,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return {
      events,
      total: events.length,
    };
  }

  @Get('teams/search')
  async searchTeams(
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      return { teams: [], total: 0 };
    }

    const teams = await this.eventsService.searchTeams(
      query,
      limit ? parseInt(limit, 10) : 20,
    );

    return {
      teams,
      total: teams.length,
    };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const event = await this.eventsService.findById(id);
    if (!event) {
      return { error: 'Event not found' };
    }
    return event;
  }

  @Get(':id/standings')
  async getStandingsForEvent(@Param('id') id: string) {
    const standings = await this.eventsService.getStandingsForEvent(id);
    if (!standings) {
      return { error: 'Event not found' };
    }
    return standings;
  }
}
