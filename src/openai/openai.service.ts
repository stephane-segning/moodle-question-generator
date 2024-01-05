import { Injectable, Logger } from '@nestjs/common';
import OpenAIApi from 'openai';
import * as fs from 'fs';
import * as process from 'process';
import * as path from 'path';
import { GeneratedResponse } from '../models/generated-question';
import { ensureDir } from '../share/file-utils';
import { v4 as uuid } from 'uuid';
import { parseDataToJson } from '../share/json-utils';

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

  async generateQuestions(
    runId: string,
    inputText: string,
    model: string,
    previousQuestions?: string,
  ): Promise<string[]> {
    log.debug(`Now some questions input: ${inputText.substring(0, 10)}...`);
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `
          You are a helpful assistant. Your task is to generate questions based on the provided topics. Follow these guidelines:

          - Use HTML format for questions.
          - Escape backslashes as "\\\\".
          - Escape quotes as "\"".
          - Output the questions in JSON format, following the provided structure:
            [
              "Question <b>simple</b> title",
              "<span>Some second question</span> simple title",
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
      temperature: 0.7,
    });

    const res = response.choices
      .map(({ message }, i) => {
        const data = message.content.trim();
        try {
          return JSON.parse(data) as string[];
        } catch (e) {
          const fileName = `output/${runId}-${
            previousQuestions?.length ?? '_'
          }-${i}.json`;
          this.saveToFile(data, fileName);
          log.error(fileName, e);
          return [];
        }
      })
      .flat();
    log.debug(`Generated questions: ${res.length}`);
    return res;
  }

  async generateResponses(
    runId: string,
    question: string,
    model: string,
  ): Promise<GeneratedResponse[]> {
    log.debug(
      `Generating responses for question: ${question.substring(0, 30)}...`,
    );
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `
          You are a helpful assistant. Your task is to generate responses on computer science based questions. Follow these guidelines:

          - Provide at least three incorrect responses. 
          - Provide exactly one correct responses.
          - Include a explanation for each response.
          - Format each response with a short title.
          - Format each response with a detailed explanation.
          - Use HTML format for response and explanation.
          - Escape backslashes as "\\\\".
          - Escape quotes (") as "\"".
          - Return only a complete JSON so that the user can parse it.
          - Use the attribute "t" with value "1" for good responses and "0" for bad responses. 
          - Output the questions in JSON format, following the provided structure:
            [
              {
                "n": "Bad <span class='active'>response</span> 1",
                "e": "Explanation for bad response 1",
                "t": "0"
              },
              {
                "n": "Bad response 2",
                "e": "<p>Explanation</p> for bad response 2",
                "t": "0"
              },
              {
                "n": "<pre><code>Good response 1</code></pre>",
                "e": "Explanation for good response 1",
                "t": "1"
              },
              {
                "n": "Bad response 3",
                "e": "<section>Explanation for bad response 3</section>",
                "t": "0"
              },
              {
                "n": "Good response 2",
                "e": "<div>Explanation</div> for <p>good</p> response 2",
                "t": "1"
              },
              ...
            ]
          `,
        },
        {
          role: 'user',
          content: `
          The LPIC-1 certification, which includes the LPIC-101 and LPIC-102 exams, covers a broad range of Linux system administration topics.
          Here's a breakdown of the key topics for each exam:
        
          Propose a question about LPIC Exam
          `,
        },
        {
          role: 'assistant',
          content: `Here is a question for the LPIC Exam: "${question}"`,
        },
        {
          role: 'user',
          content: `Please generate at least four responses for this question: "${question}"`,
        },
      ],
      temperature: 0.7,
    });

    const res = response.choices
      .map(({ message }, i) => {
        const data = message.content.trim();
        try {
          return parseDataToJson<GeneratedResponse[]>(data);
        } catch (e) {
          const fileName = `output/${runId}-res-${uuid()}-${i}.json`;
          this.saveToFile(data, fileName);
          log.error(fileName, e);
          return [];
        }
      })
      .flat();
    log.debug(`Generated responses: ${res.length}`);
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
