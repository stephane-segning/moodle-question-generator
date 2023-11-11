import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import {
  delay,
  forkJoin,
  map,
  merge,
  Observable,
  of,
  switchMap,
  tap,
  toArray,
} from 'rxjs';
import { Answer, Question } from '../models/question';

const log = new Logger('QuestionService');

@Injectable()
export class QuestionService {
  constructor(private readonly openaiService: OpenaiService) {}

  public generateQuestions(
    text: string,
    model: string,
    openaiKey?: string,
  ): Observable<Question[]> {
    log.debug('Generating questions...');
    return fromPromise(this.openaiService.initOpenAI(openaiKey)).pipe(
      switchMap(() => this.openaiService.generateQuestions(text, model)),
      tap((questions) => log.debug(`Generated ${questions.length} questions`)),
      switchMap((questions) =>
        forkJoin(
          questions.map((question) => this.completeQuestion(question, model)),
        ),
      ),
    );
  }

  private completeQuestion(
    question: string,
    model: string,
  ): Observable<Question> {
    log.debug(`Generating name for question: ${question}`);
    const name = fromPromise(this.openaiService.generateName(question, model));

    const goodAnswer: Observable<{ answer: string[]; fraction: number }> =
      fromPromise(
        this.openaiService.generateGoodFeedback(question, model),
      ).pipe(
        map((a) => ({ answer: a, fraction: 100 })),
        tap((a) => log.debug(`Generated good answer: ${a.answer}`)),
      );

    const badAnswers: Observable<{ answer: string[]; fraction: number }> =
      fromPromise(this.openaiService.generateBadFeedback(question, model)).pipe(
        map((a) => ({ answer: a, fraction: 0 })),
        tap((a) => log.debug(`Generated bad answer: ${a.answer}`)),
      );

    const answers: Observable<Answer[]> = merge(goodAnswer, badAnswers).pipe(
      switchMap(({ answer, fraction }) =>
        answer.map((a) => ({ answer: a, fraction })),
      ),
      delay(500),
      switchMap(async ({ answer, fraction }) => {
        const feedback = await this.openaiService.generateFeedback(
          question,
          answer,
          model,
        );
        return { answer, feedback, fraction };
      }),
      toArray(),
      tap((answers) => log.debug(`Generated ${answers.length} answers`)),
    );

    return forkJoin({
      answers,
      name,
      question: of(question),
      single: of(true),
    });
  }
}
