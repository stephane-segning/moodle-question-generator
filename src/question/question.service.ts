import { Injectable, Logger } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { map, mergeAll, Observable, of, switchMap, toArray, zip } from 'rxjs';
import { Question } from '../models/question';
import { uniqBy } from 'lodash';
import { GeneratedQuestion } from '../models/generated-question';

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
        switchMap((questions) => {
          const previousQuestions = questions
            .map((question) => `-- "${question.question}"`)
            .join('\n');
          return zip([
            of(questions),
            this.helper(runId, text, model, previousQuestions),
          ]);
        }),
        map(([questions, newQuestions]) =>
          uniqBy([...questions, ...newQuestions], 'question'),
        ),
      );
    }
    return next.pipe(toArray(), mergeAll());
  }

  private parseToQuestion(question: GeneratedQuestion): Question {
    const goodResponses = question.r.filter((a) => a.t === 1);
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
    log.debug('Generating questions...');
    return fromPromise(
      this.openaiService.generateQuestions(
        runId,
        text,
        model,
        previousQuestions,
      ),
    ).pipe(map((questions) => questions.map((q) => this.parseToQuestion(q))));
  }
}
