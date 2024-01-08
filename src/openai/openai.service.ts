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
    log.debug(`Now some questions input: ${inputText.substring(0, 100)}...`);
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `
          You are a helpful assistant. Your task is to generate questions based on the provided topics. Follow these guidelines:

          - Use HTML format for questions.
          - Provide questions that can have a single answer.
          - Escape backslash (\) as "\\".
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
          
          ${previousQuestions ? 'PS: Here are previous questions:\n' : ''}
          ${previousQuestions ?? ''}
          ${previousQuestions ? '\nSkip them!' : ''}
          `,
        },
      ],
      temperature: 0.7,
    });

    const res = response.choices
      .map(({ message }, i) => {
        const data = message.content.trim();
        try {
          return parseDataToJson<string[]>(data);
        } catch (e) {
          const fileName = `output/question-${runId}-${
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

  async generateBadResponses(
    runId: string,
    question: string,
    model: string,
  ): Promise<GeneratedResponse[]> {
    log.debug(
      `Generating wrong responses for question: ${question.substring(
        0,
        100,
      )}...`,
    );
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `
          You are a helpful assistant. Your task is to generate only wrong or misleading responses on computer science based questions for a quizz.
          User would be shown the text, and after correction, the explanation. 
          
          Follow these guidelines:

          - Provide four incorrect responses. 
          - Format each response with a simple, short, distinct but wrong, misleading or incorrect text.
          - Format each response with a detailed explanation about why it's wrong, incorrect or misleading – one or two sentences should be enough.
          - Use HTML format for answer and explanation.
          - Escape special characters.
          - Return only a complete and parsable JSON, representing an array of objects, so that the user can parse it.
          - For each object:
            - The attribute "n" is the answer.
            - The attribute "e" is the explanation of the answer.
          - Output the answers in JSON format, following the provided structure:
            [
              {
                "n": "Bad <span class='active'>answer</span> 1",
                "e": "Explanation for bad answer 1"
              },
              {
                "n": "Bad answer 2",
                "e": "<p>Explanation</p> for bad answer 2"
              },
              {
                "n": "<pre>Wrong answer 3</pre>",
                "e": "<div>Explanation</div> for <p>good</p> answer 2"
              },
              ...
            ]
          `,
        },
        {
          role: 'user',
          content: `List at least five wrong or misleading responses for this question: ${question}`,
        },
      ],
      temperature: 0.2,
    });

    const res = response.choices
      .map(({ message }, i) => {
        const data = message.content.trim();
        try {
          return parseDataToJson<GeneratedResponse[]>(data);
        } catch (e) {
          const fileName = `output/wrong-${runId}-res-${uuid()}-${i}.json`;
          this.saveToFile(data, fileName);
          log.error(fileName, e);
          return [];
        }
      })
      .flat();
    log.debug(`Generated answers: ${res.length}`);
    return res;
  }

  public async generatePositiveAnswer(
    runId: string,
    question: string,
    model: string,
  ) {
    log.debug(
      `Generating good responses for question: ${question.substring(
        0,
        100,
      )}...`,
    );
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `
          You are a helpful assistant. Your task is to generate correct responses on computer science based questions for a quizz.
          User would be shown the text, and after correction, the explanation.
          
          Follow these guidelines:

          - Provide at least one correct response. 
          - Format each response with a simple, short, distinct and accurate text – one sentence is enough.
          - Format each response with a detailed explanation about why it's correct – one or two sentences should be enough.
          - Use HTML format for answer and explanation.
          - Escape special characters.
          - Return only a complete and parsable JSON, representing an array of objects, so that the user can parse it.
          - For each object:
            - The attribute "n" is the answer.
            - The attribute "e" is the explanation of the answer.
          - Output the answers in JSON format, following the provided structure:
            [
              {
                "n": "Correct <span class='active'>response</span> 1",
                "e": "Explanation for correct response 1"
              },
              ...
            ]
          `,
        },
        {
          role: 'user',
          content: `List at least one good responses for this question: ${question}`,
        },
      ],
      temperature: 0.2,
    });

    const res = response.choices
      .map(({ message }, i) => {
        const data = message.content.trim();
        try {
          return parseDataToJson<GeneratedResponse[]>(data);
        } catch (e) {
          const fileName = `output/response-${runId}-res-${uuid()}-${i}.json`;
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
