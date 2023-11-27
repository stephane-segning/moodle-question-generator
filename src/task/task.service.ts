import { Command, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { switchMap, tap } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { BaseService } from '../core/base.service';
import { readFileAsObservable, toFile } from '../share/file-utils';
import { QuestionService } from '../question/question.service';
import { XmlService } from '../xml/xml.service';
import { OpenaiService } from '../openai/openai.service';

const log = new Logger('TaskService');

@Command({
  name: 'modq',
  arguments: '<input-file> <output-file>',
  options: { isDefault: true },
})
export class TaskService extends BaseService {
  constructor(
    questionService: QuestionService,
    xmlService: XmlService,
    openaiService: OpenaiService,
  ) {
    super(questionService, xmlService, openaiService);
  }

  async run(
    [inputFile, outputFile]: string[],
    options: Record<'openaiKey' | 'model' | 'max_gen', string | number>,
  ): Promise<void> {
    const currentDateTime = new Date().getTime();
    const runId = uuid();
    log.log(`Running task n° ${runId}.`);

    const result = this.initOpenAI(options.openaiKey as string).pipe(
      switchMap(() => readFileAsObservable(inputFile)),
      switchMap((data) =>
        this.doRun(
          data.toString('utf-8'),
          options.model as string,
          options.max_gen as number,
        ),
      ),
      tap((questionsResult) =>
        log.debug(`Done with ${questionsResult.length} questions`),
      ),
      toFile(outputFile),
    );

    result.subscribe({
      next: () => {
        const time = new Date().getTime() - currentDateTime;
        log.log(`Task n° ${runId} completed in ${time / (1000 * 60)}m`);
      },
      error: (err) => {
        log.error(err);
        process.exit(1);
      },
    });
  }

  @Option({
    flags: '-k, --openai-key <key>',
    description: 'The OpenAI API key to use',
    required: false,
  })
  parseOpenAiKey(val: string) {
    log.debug(
      `OpenAI key: ${val.substring(0, 4)}...${val.substring(val.length - 4)}`,
    );
    return val;
  }

  @Option({
    flags: '-m, --model <key>',
    description: 'The OpenAI API key to use',
    required: true,
  })
  parseOpenAiModel(val: string) {
    log.debug(`OpenAI model: ${val}`);
    return val;
  }

  @Option({
    flags: '-g, --max_gen <value>',
    description: 'The max number of generations to run',
    required: true,
  })
  parseMaxGen(val: string) {
    log.debug(`max_gen: ${val}`);
    return Number(val);
  }
}
