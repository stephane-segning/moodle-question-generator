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
import { GeneratedQuestion } from '../models/generated-question';
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

  private parseToQuestion(question: GeneratedQuestion): Question {
    const goodResponses = question.r.filter((a) => Number(a.t) === 1);
    return {
      name: question.n,
      question: question.n,
      single: false,
      answers: question.r.map((answer) => {
        return {
          answer: answer.n,
          feedback: answer.e,
          fraction:
            goodResponses.length > 0
              ? (Number(answer.t) * 100) / goodResponses.length
              : 0,
        };
      }),
    };
  }

  private helper(
    runId: string,
    text: string,
    model: string,
    previousQuestions?: string,
  ): Observable<Question[]> {
    return fromPromise(
      this.openaiService.generateQuestions(
        runId,
        text,
        model,
        previousQuestions,
      ),
    ).pipe(
      switchMap((questions) =>
        forkJoin(
          questions.map((q, idx) =>
            of(q).pipe(
              delay(idx * qtDelay),
              switchMap((q) => this.getResponses(runId, q, model)),
            ),
          ),
        ),
      ),
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
          this.openaiService.generateResponses(runId, question, model),
        ),
      ),
      map((responses) =>
        this.parseToQuestion({ n: question, r: uniqBy(responses, 'n') }),
      ),
    );
  }
}
