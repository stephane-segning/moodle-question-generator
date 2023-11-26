import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { map, Observable, switchMap, tap, toArray } from 'rxjs';
import { Question } from '../models/question';

const log = new Logger('QuestionService');

@Injectable()
export class QuestionService {
  constructor(private readonly openaiService: OpenaiService) {}

  public generateQuestions(
    runId: string,
    text: string,
    model: string,
    openaiKey?: string,
  ): Observable<Question[]> {
    log.debug('Generating questions...');
    return fromPromise(this.openaiService.initOpenAI(openaiKey)).pipe(
      switchMap(() => this.openaiService.generateQuestions(runId, text, model)),
      tap((questions) => log.debug(`Generated ${questions.length} questions`)),
      switchMap((questions) => questions),
      map((question) => {
        return {
          name: question.n,
          question: question.n,
          single: question.r.filter((a) => a.t === 1).length === 1,
          answers: question.r.map((answer) => {
            return {
              answer: answer.n,
              feedback: answer.e,
              fraction: Number(answer.t),
            };
          }),
        } as Question;
      }),
      toArray(),
    );
  }
}
