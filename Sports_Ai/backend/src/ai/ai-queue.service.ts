import { Injectable, Logger } from '@nestjs/common';
import { AiFacadeService } from './ai.facade.service';

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface AiJob {
  id: string;
  userId: string;
  type: 'advice' | 'news' | 'chat' | 'tips';
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  progress?: number;
}

@Injectable()
export class AiQueueService {
  private readonly logger = new Logger(AiQueueService.name);
  private jobs = new Map<string, AiJob>();
  private readonly maxJobsPerUser = 10;
  private readonly jobTimeoutMs = 30000; // 30 seconds max per job

  constructor(private readonly aiFacade: AiFacadeService) {
    // Clean up old completed/failed jobs every 5 minutes
    setInterval(() => this.cleanupOldJobs(), 5 * 60 * 1000);
  }

  /**
   * Create a new AI job and start processing it asynchronously
   */
  async createJob(
    userId: string,
    type: AiJob['type'],
    params: any,
  ): Promise<string> {
    // Clean up old jobs for this user first
    this.cleanupUserJobs(userId);

    // Check job limit per user
    const userJobs = Array.from(this.jobs.values()).filter(
      (j) => j.userId === userId && j.status !== JobStatus.COMPLETED && j.status !== JobStatus.FAILED,
    );
    if (userJobs.length >= this.maxJobsPerUser) {
      throw new Error(`Maximum ${this.maxJobsPerUser} active jobs per user`);
    }

    const jobId = `ai-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job: AiJob = {
      id: jobId,
      userId,
      type,
      status: JobStatus.PENDING,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start processing asynchronously (don't await)
    this.processJob(jobId, params).catch((error) => {
      this.logger.error(`Job ${jobId} processing failed: ${error.message}`);
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = JobStatus.FAILED;
        job.error = error.message;
        job.completedAt = new Date();
      }
    });

    return jobId;
  }

  /**
   * Get job status and result
   */
  getJob(jobId: string, userId: string): AiJob | null {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }
    // Security: only return job if it belongs to the user
    if (job.userId !== userId) {
      return null;
    }
    return job;
  }

  /**
   * Cancel a pending job
   */
  cancelJob(jobId: string, userId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.userId !== userId) {
      return false;
    }
    if (job.status === JobStatus.PENDING) {
      job.status = JobStatus.FAILED;
      job.error = 'Cancelled by user';
      job.completedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Process a job asynchronously
   */
  private async processJob(jobId: string, params: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = JobStatus.PROCESSING;
    job.startedAt = new Date();

    try {
      // Set a timeout for the job
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), this.jobTimeoutMs);
      });

      // Process based on job type
      let result: any;
      switch (job.type) {
        case 'advice':
          result = await Promise.race([
            this.processAdviceJob(params),
            timeoutPromise,
          ]) as any;
          break;
        case 'news':
          result = await Promise.race([
            this.processNewsJob(params),
            timeoutPromise,
          ]) as any;
          break;
        case 'chat':
          result = await Promise.race([
            this.processChatJob(params),
            timeoutPromise,
          ]) as any;
          break;
        case 'tips':
          result = await Promise.race([
            this.processTipsJob(params),
            timeoutPromise,
          ]) as any;
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.status = JobStatus.COMPLETED;
      job.result = result;
      job.completedAt = new Date();
    } catch (error: any) {
      this.logger.error(`Job ${jobId} failed: ${error.message}`);
      job.status = JobStatus.FAILED;
      job.error = error.message || 'Unknown error';
      job.completedAt = new Date();
    }
  }

  private async processAdviceJob(params: {
    configuration: any;
    matches: any[];
    languageCode: string;
    userId: string;
    ipAddress: string;
  }): Promise<any> {
    const advice = await this.aiFacade.generateAdvice(
      params.configuration,
      params.matches,
    );

    return {
      advice,
      configuration: params.configuration,
      matchCount: params.matches.length,
      language: params.languageCode,
    };
  }

  private async processNewsJob(params: {
    sportKeys: string[];
    languageCode: string;
    userId: string;
  }): Promise<any> {
    const news = await this.aiFacade.getLatestSportsNews(params.sportKeys);
    
    // If no news from NewsAPI, try AI generation
    if (news.length === 0) {
      const aiNews = await this.aiFacade.generateNews(
        params.sportKeys,
        params.languageCode,
      );
      return {
        news: aiNews.map((item) => ({
          id: item.id,
          headline: item.headline,
          summary: item.summary,
          url: '#',
          source: 'AI-Search',
          sport: item.sport,
          publishedAt: item.createdAt,
          impact: item.impact,
        })),
        sportScope: params.sportKeys,
        language: params.languageCode,
        source: 'AI-Search',
      };
    }

    return {
      news,
      sportScope: params.sportKeys,
      language: params.languageCode,
      source: 'NewsAPI',
    };
  }

  private async processChatJob(params: {
    message: string;
    userId: string;
    ipAddress: string;
    context: any;
  }): Promise<any> {
    const response = await this.aiFacade.chat(params.message, params.context);
    return {
      response,
      suggestedActions: params.context.suggestedActions || [],
    };
  }

  private async processTipsJob(params: {
    userId: string;
    type?: string;
  }): Promise<any> {
    const tickets = await this.aiFacade.getDailyTickets(params.userId);
    return {
      tickets,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Clean up old completed/failed jobs (older than 1 hour)
   */
  private cleanupOldJobs(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) &&
        job.completedAt &&
        job.completedAt.getTime() < oneHourAgo
      ) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Clean up old jobs for a specific user
   */
  private cleanupUserJobs(userId: string): void {
    const userJobs = Array.from(this.jobs.entries()).filter(
      ([, job]) => job.userId === userId,
    );
    
    // Keep only the 5 most recent jobs per user
    if (userJobs.length > 5) {
      userJobs
        .sort((a, b) => b[1].createdAt.getTime() - a[1].createdAt.getTime())
        .slice(5)
        .forEach(([jobId]) => this.jobs.delete(jobId));
    }
  }
}
