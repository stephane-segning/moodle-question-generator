import { Command, Option } from 'nest-commander';
import { bufferCount, concatMap, forkJoin, from, switchMap, tap } from 'rxjs';
import * as path from 'path';
import { BaseService } from '../core/base.service';
import { v4 as uuid } from 'uuid';
import { Logger } from '@nestjs/common';
import { ensureDir, parseCsv, toFile } from '../share/file-utils';
import { QuestionService } from '../question/question.service';
import { XmlService } from '../xml/xml.service';
import { OpenaiService } from '../openai/openai.service';
import { MultipleOptions } from '../models/multiple';

const template = (exam: string, category: string, topic: string) => `
The LPIC-1 certification, which includes the LPIC-101 and LPIC-102 exams, covers a broad range of Linux system administration topics.
Here's a breakdown of the key topics for each exam:

Propose at least twenty-four questions about "${exam}" Exam in "${category}" domain on this topic "${topic}"
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

    const currentDateTime = new Date().getTime();
    const runId = uuid();

    const result = this.initOpenAI(options.openaiKey as string).pipe(
      switchMap(() => parseCsv(inputCsvFile)),
      tap((cts) => console.log(`Loaded ${cts.length} mappings`)),
      switchMap((categories) =>
        from(categories).pipe(
          bufferCount(1),
          concatMap((group) =>
            forkJoin(
              group.map((data) => {
                const outputFile = path.join(
                  outputFolder,
                  `${runId}--${data.exam}–––${data.category}–––${data.topic}.xml`,
                );
                log.log(`Generating questions for ${data.topic}`);
                return this.doRun(
                  template(data.exam, data.category, data.topic),
                  options.model as string,
                  options.max_gen as number,
                  options.tags as string[],
                ).pipe(toFile(outputFile));
              }),
            ),
          ),
        ),
      ),
    );

    result.subscribe({
      next: () => {
        const time = new Date().getTime() - currentDateTime;
        log.log(`Task n° ${runId} completed in ${time / (1000 * 60)}m`);
      },
      error: (err) => {
        console.error(err);
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
