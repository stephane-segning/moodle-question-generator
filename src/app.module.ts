import { Module } from '@nestjs/common';
import { TaskService } from './task/task.service';
import { OpenaiService } from './openai/openai.service';
import { QuestionService } from './question/question.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { XmlService } from './xml/xml.service';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore as any,
        ttl: Number(configService.get('CACHE_TTL', '-1')),
        host: configService.get('REDIS_HOST', 'localhost'),
        port: Number(configService.get('REDIS_PORT', '6379')),
      }),
    }),
  ],
  providers: [TaskService, OpenaiService, QuestionService, XmlService],
})
export class AppModule {}
