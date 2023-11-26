import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { QuestionService } from '../question/question.service';
import { XmlService } from '../xml/xml.service';
import { bindNodeCallback, map, switchMap, tap } from 'rxjs';
import { v4 as uuid } from 'uuid';

const log = new Logger('TaskService');

const readFileAsObservable = bindNodeCallback(fs.readFile);
const writeFileAsObservable = bindNodeCallback(fs.writeFile);

@Command({
  name: 'modq',
  arguments: '<input-file> <output-file>',
  options: { isDefault: true },
})
export class TaskService extends CommandRunner {
  constructor(
    private readonly questionService: QuestionService,
    private readonly xmlService: XmlService,
  ) {
    super();
  }

  async run(
    [inputFile, outputFile]: string[],
    options: Record<'openaiKey' | 'model', string>,
  ): Promise<void> {
    const currentDateTime = new Date().getTime();
    const runId = uuid();
    log.log(`Running task n° ${runId}.`);

    const result = readFileAsObservable(inputFile).pipe(
      switchMap((data) =>
        this.questionService.generateQuestions(
          runId,
          data.toString('utf-8'),
          options.model,
          options.openaiKey,
        ),
      ),
      tap((questionsResult) =>
        log.debug(`Done with ${questionsResult.length} questions`),
      ),
      map((questionsResult) => this.xmlService.toXml(questionsResult)),
      tap(() => log.debug(`Writing result to ${outputFile}`)),
      switchMap((result) =>
        writeFileAsObservable(
          outputFile,
          '<?xml version="1.0" encoding="UTF-8"?>' + result,
        ),
      ),
    );

    result.subscribe({
      next: () => {
        const time = new Date().getTime() - currentDateTime;
        log.log(`Task n° ${runId} completed in ${time}ms`);
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
    required: false,
    defaultValue: 'gpt-3.5-turbo',
  })
  parseOpenAiModel(val: string) {
    log.debug(`OpenAI model: ${val}`);
    return val;
  }
}
