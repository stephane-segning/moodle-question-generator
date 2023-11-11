import { Module } from '@nestjs/common';
import { TaskService } from './task/task.service';
import { OpenaiService } from './openai/openai.service';
import { QuestionService } from './question/question.service';
import { ConfigModule } from '@nestjs/config';
import { XmlService } from './xml/xml.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [TaskService, OpenaiService, QuestionService, XmlService],
})
export class AppModule {}
