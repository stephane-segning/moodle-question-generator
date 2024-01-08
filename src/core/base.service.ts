import { v4 as uuid } from 'uuid';
import { map, Observable, of, tap, zip } from 'rxjs';
import { Logger } from '@nestjs/common';
import { CommandRunner } from 'nest-commander';
import { QuestionService } from '../question/question.service';
import { XmlService } from '../xml/xml.service';
import { OpenaiService } from '../openai/openai.service';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';

const log = new Logger('BaseService');

export abstract class BaseService extends CommandRunner {
  constructor(
    protected readonly questionService: QuestionService,
    protected readonly xmlService: XmlService,
    protected readonly openaiService: OpenaiService,
  ) {
    super();
  }

  public abstract parseOpenAiKey(val: string);
  public abstract parseOpenAiModel(val: string);
  public abstract parseMaxGen(val: string);

  protected initOpenAI(apiKey?: string): Observable<void> {
    return fromPromise(this.openaiService.initOpenAI(apiKey));
  }

  protected doRun(
    input: string,
    model: string,
    max_gen: number,
    tags: string[] = [],
  ): Observable<[string, string]> {
    const currentDateTime = new Date().getTime();
    const runId = uuid();
    log.log(`Running task n° ${runId}.`);

    const result = this.questionService
      .generateQuestions(runId, input, model, max_gen)
      .pipe(
        tap((questionsResult) =>
          log.debug(`Done with ${questionsResult.length} questions`),
        ),
        map((questionsResult) => this.xmlService.toXml(questionsResult, tags)),
        tap(() => {
          const time = new Date().getTime() - currentDateTime;
          log.log(`Task n° ${runId} completed in ${time / (1000 * 60)}m`);
        }),
      );
    return zip(result, of(runId));
  }
}
