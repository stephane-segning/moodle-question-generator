import { Injectable, Logger } from '@nestjs/common';
import OpenAIApi from 'openai';
import { CacheKey } from '@nestjs/cache-manager';
import * as fs from 'fs';
import * as process from 'process';
import * as path from 'path';
import { GeneratedQuestion } from '../models/generated-question';
import { ensureDir } from '../share/file-utils';

const log = new Logger('OpenaiService');

@Injectable()
export class OpenaiService {
  private openai: OpenAIApi;

  public async initOpenAI(apiKey?: string): Promise<void> {
    log.debug('Initializing OpenAI API');
    this.openai = new OpenAIApi({
      apiKey: apiKey,
    });
    log.debug('Initialized OpenAI API');
  }

  @CacheKey('generate_questions')
  async generateQuestions(
    runId: string,
    inputText: string,
    model: string,
    previousQuestions?: string,
  ): Promise<GeneratedQuestion[]> {
    log.debug(
      `Generating questions for input: ${inputText.substring(0, 10)}...`,
    );
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `
          You are a helpful assistant. Your task is to generate multiple-choice questions (MCQs) based on the provided topics. Follow these guidelines:

          - Format each question with a short title.
          - Provide 1 to 4 incorrect (bad) responses AND 1 to 2 correct (good) responses for each question.
          - Include a brief explanation for each response.
          - Use HTML format for questions and responses.
          - Escape backslashes as "\\\\".
          - Escape quotes as "\"".
          - Output the questions in JSON format, following the provided structure:
            [
              {
                "t": "Question simple title
                "n": "Full question in HTML format",
                "r": [
                  {
                    "n": "Bad <span class='active'>response</span> 1",
                    "e": "Explanation for bad response 1",
                    "t": 0
                  },
                  {
                    "n": "Bad response 2",
                    "e": "Explanation for bad response 2",
                    "t": 0
                  },
                  {
                    "n": "Good response 1",
                    "e": "Explanation for good response 1",
                    "t": 1
                  },
                  {
                    "n": "Bad response 3",
                    "e": "Explanation for bad response 3",
                    "t": 0
                  },
                  {
                    "n": "Good response 2",
                    "e": "Explanation for good response 2",
                    "t": 1
                  },
                  ...
                ]
              },
              {
                "t": "Some second question simple title",
                "n": "This is <b>some second</b> question. Why is it so difficult?",
                "r": [
                  {
                    "n": "Bad response 1",
                    "e": "Explanation for bad response 1",
                    "t": 0
                  },
                  {
                    "n": "Bad response 2",
                    "e": "<body>Explanation for bad response 2</body>",
                    "t": 0
                  },
                  {
                    "n": "Good response 1",
                    "e": "<div>Explanation for good response 2</div>",
                    "t": 1
                  },
                  ...
                ]
              },
              ...
            ]
          - Ensure variety in topics and complexity.
          - Do not repeat any previous questions provided below, if any.
          - Return only a complete JSON so that the user can parse it.
          `,
        },
        {
          role: 'user',
          content: `
          "${inputText}"
          
          ${previousQuestions ?? 'Here are previous questions:'}
          ${previousQuestions ?? ''}
          `,
        },
      ],
      temperature: 0.8,
    });

    const res = response.choices
      .map(({ message }, i) => {
        const data = message.content.trim();
        const fileName = `output/${runId}-${
          previousQuestions?.length ?? '_'
        }-${i}.json`;
        try {
          return JSON.parse(data) as GeneratedQuestion[];
        } catch (e) {
          this.saveToFile(data, fileName);
          log.error(fileName, e);
          return [];
        }
      })
      .flat();
    log.debug(`Generated questions: ${res.length}`);
    return res;
  }

  private async saveToFile(data: string, fileName: string): Promise<void> {
    const file = path.join(process.cwd(), fileName);
    ensureDir(path.dirname(file));
    await new Promise((resolve, reject) => {
      fs.writeFile(file, data, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(undefined);
        }
      });
    });
  }
}
