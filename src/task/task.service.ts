import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { XMLBuilder } from 'fast-xml-parser';
import { QuestionService } from '../question/question.service';

const log = new Logger('TaskService');

@Command({
  name: 'modq',
  arguments: '<input-file> <output-file>',
  options: { isDefault: true },
})
export class TaskService extends CommandRunner {
  constructor(private readonly questionService: QuestionService) {
    super();
  }

  async run(
    [inputFile, outputFile]: string[],
    options: Record<'openaiKey' | 'model', string>,
  ): Promise<void> {
    log.debug('Running task...');
    const file = fs.readFileSync(inputFile, 'utf8');
    const questionsResult = await this.questionService.generateQuestions(
      file,
      options.model,
      options.openaiKey,
    );

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      preserveOrder: true,
      suppressBooleanAttributes: true,
      attributeNamePrefix: '@_',
    });

    const result = builder.build({
      quiz: {
        question: questionsResult.map(
          ({ question, answers, name, single }) => ({
            '@_text': 'multichoice',
            name: {
              text: name,
            },
            questiontext: {
              '@_format': 'html',
              text: `<![CDATA[${question}]]>`,
            },
            answer: answers.map(({ answer, feedback, fraction }) => ({
              text: `<![CDATA[${answer}]]>`,
              fraction,
              feedback: {
                text: `<![CDATA[${feedback}]]>`,
              },
            })),
            shuffleanswers: 1,
            single,
          }),
        ),
      },
    });

    log.debug(`Writing result to ${outputFile}`);
    fs.writeFileSync(outputFile, '<?xml version="1.0" ?>' + result);
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
