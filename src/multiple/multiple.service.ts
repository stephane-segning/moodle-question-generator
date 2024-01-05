import { Command, Option } from 'nest-commander';
import { delay, forkJoin, of, switchMap, tap } from 'rxjs';
import * as path from 'path';
import { BaseService } from '../core/base.service';
import { v4 as uuid } from 'uuid';
import { Logger } from '@nestjs/common';
import { ensureDir, parseCsv, toFile } from '../share/file-utils';
import { QuestionService } from '../question/question.service';
import { XmlService } from '../xml/xml.service';
import { OpenaiService } from '../openai/openai.service';
import { MultipleOptions } from '../models/multiple';
import { ctDelay } from '../share/delays';

const template = (exam: string, category: string, topic: string) => `
Propose at least twenty questions relevant for the "${exam}" Exam in the field "${category}" on this topic "${topic}"
`;

const log = new Logger('MultipleService');

@Command({
  name: 'modm',
  arguments: '<input-file> <output-folder>',
  options: { isDefault: false },
})
export class MultipleService extends BaseService {
  constructor(
    questionService: QuestionService,
    xmlService: XmlService,
    openaiService: OpenaiService,
  ) {
    super(questionService, xmlService, openaiService);
  }

  async run(
    [inputCsvFile, outputFolder]: string[],
    options: MultipleOptions,
  ): Promise<void> {
    ensureDir(outputFolder);

    const runId = uuid();

    const result = this.initOpenAI(options.openaiKey).pipe(
      switchMap(() => parseCsv(inputCsvFile)),
      tap((cts) => log.debug(`Loaded ${cts.length} mappings`)),
      switchMap((categories) =>
        forkJoin(
          categories.map((data, idx) => {
            const outputFile = path.join(
              outputFolder,
              `${data.category}–––${data.topic}---${data.exam}---${runId}.xml`,
            );
            return of(data).pipe(
              delay(idx * ctDelay),
              tap(() => log.debug(`Generating questions for ${data.topic}`)),
              switchMap(() =>
                this.doRun(
                  template(data.exam, data.category, data.topic),
                  options.model as string,
                  options.max_gen as number,
                  options.tags as string[],
                ).pipe(toFile(outputFile)),
              ),
            );
          }),
        ),
      ),
    );

    result.subscribe({
      next: () => {
        log.log(`[${runId}] All's done without errors!`);
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

  @Option({
    flags: '-t, --tag <tag>',
    description: 'A tag to use for the generation',
    required: false,
  })
  parseTag(val: string) {
    log.debug(`val: ${val}`);
    return val.split(',').map((t) => t.trim());
  }
}
