import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';

const log = new Logger('QuestionService');

@Injectable()
export class QuestionService {
  constructor(private readonly openaiService: OpenaiService) {}

  async generateQuestions(text: string, model: string, openaiKey?: string) {
    log.debug('Generating questions...');
    await this.openaiService.initOpenAI(openaiKey);
    const questions = await this.openaiService.generateQuestions(text, model);

    const questionsProm = questions.map((question) =>
      this.generateName(question, model),
    );
    return Promise.all(questionsProm);
  }

  private async generateName(question: string, model: string) {
    log.debug(`Generating name for question: ${question}`);
    const name = await this.openaiService.generateName(question, model);

    const goodAnswer = await this.openaiService.generateGoodFeedback(
      question,
      model,
    );
    const badAnswers = await this.openaiService.generateBadFeedback(
      question,
      model,
    );

    const answers = await Promise.all(
      [
        ...goodAnswer.map((a) => ({ answer: a, fraction: 100 })),
        ...badAnswers.map((a) => ({ answer: a, fraction: 0 })),
      ].map(async ({ answer, fraction }) => {
        const feedback = await this.openaiService.generateFeedback(
          question,
          answer,
          model,
        );
        return { answer, feedback, fraction };
      }),
    );

    log.debug(`Generated name: ${name}`);
    return {
      question,
      name,
      answers,
      single: goodAnswer.length === 0,
    };
  }
}
