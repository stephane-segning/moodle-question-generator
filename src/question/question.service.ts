import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import {
  concatMap,
  delay,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  zip,
} from 'rxjs';
import { Question } from '../models/question';
import { uniqBy } from 'lodash';
import {
  GeneratedQuestion,
  GeneratedResponse,
} from '../models/generated-question';
import { qtDelay } from '../share/delays';

const log = new Logger('QuestionService');

@Injectable()
export class QuestionService {
  constructor(private readonly openaiService: OpenaiService) {}

  public generateQuestions(
    runId: string,
    text: string,
    model: string,
    maxGen = -1,
  ): Observable<Question[]> {
    log.debug('Generating questions...');
    let next = this.helper(runId, text, model);
    for (let i = 0; i < maxGen; i++) {
      next = next.pipe(
        concatMap((questions) => {
          const previousQuestions = questions
            .map((question) => `- "${question.question}"`)
            .join('\n');
          return zip([
            of(questions),
            this.helper(runId, text, model, previousQuestions),
          ]);
        }),
        map(([questions, newQuestions]) => {
          const tmp = [...questions, ...newQuestions];
          const finalQuestions = uniqBy(tmp, 'question');
          if (finalQuestions.length !== tmp.length) {
            log.debug(
              `Removed ${tmp.length - finalQuestions.length} duplicates over ${
                tmp.length
              } questions`,
            );
          }
          return finalQuestions;
        }),
      );
    }
    return next;
  }

  private async parseToQuestion(
    question: GeneratedQuestion,
  ): Promise<Question> {
    const goodResponses = question.r.filter((a) => Number(a.t) === 1);
    return {
      name: question.n,
      question: question.n,
      single: goodResponses.length === 1,
      answers: question.r.map((answer) => ({
        answer: answer.n,
        feedback: answer.e,
        fraction:
          goodResponses.length > 0
            ? answer.t === '1'
              ? 100 / goodResponses.length
              : 0
            : -100,
      })),
    };
  }

  private helper(
    runId: string,
    text: string,
    model: string,
    pQuestions?: string,
  ): Observable<Question[]> {
    return fromPromise(
      this.openaiService.generateQuestions(runId, text, model, pQuestions),
    ).pipe(
      switchMap((questions) =>
        forkJoin(
          questions.map((q, idx) =>
            of(q).pipe(
              delay(idx * qtDelay),
              map((q) => [q, !(pQuestions && pQuestions.includes(q))]),
              switchMap(([q, notSkip]) =>
                notSkip
                  ? this.getResponses(runId, q as string, model)
                  : of(undefined),
              ),
            ),
          ),
        ),
      ),
      map((questions) => questions.filter((q) => !!q)),
    );
  }

  private getResponses(
    runId: string,
    question: string,
    model: string,
  ): Observable<Question> {
    return of(question).pipe(
      concatMap((question) =>
        fromPromise(
          Promise.all([
            this.openaiService.generateBadResponses(runId, question, model),
            this.openaiService.generatePositiveAnswer(runId, question, model),
          ]),
        ),
      ),
      switchMap(([wrongs, goods]) =>
        this.parseToQuestion({
          n: question,
          r: uniqBy(
            [
              ...wrongs.map((g) => ({ ...g, t: '0' })),
              ...goods.map((g) => ({ ...g, t: '1' })),
            ] as GeneratedResponse[],
            'n',
          ),
        }),
      ),
    );
  }
}
