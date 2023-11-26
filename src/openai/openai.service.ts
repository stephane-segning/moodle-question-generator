import { Injectable, Logger } from '@nestjs/common';
import OpenAIApi from 'openai';
import { CacheKey } from '@nestjs/cache-manager';
import * as fs from 'fs';
import * as process from 'process';
import * as path from 'path';
import { GeneratedQuestion } from '../models/generated-question';

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
  ): Promise<GeneratedQuestion[]> {
    log.debug(
      `Generating questions for input: ${inputText.substring(0, 10)}...`,
    );
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant',
        },
        {
          role: 'user',
          content: `
          Hello, as a competent, pedagogical and serious educator with years of experience, imagine that your ability to explain complex subjects in a simple and attractive way is exceptional. 
          Generate 6 multiple-choice questions (MCQs) on the provided course content below. Each question should have a short title. Each question should be followed by 6 responses: 1 to 4 incorrect (bad) and 1 to 2 correct (good). After each response, provide a simple but clear explanation. Format the questions and responses in HTML. Ensure the structure is consistent and easily adaptable to different formats. The output should be a JSON as follows:
          
          [
            {
              "t": "Neil Armstrong's spaceship",
              "n": "What is the name of <i>Neil Armstrong's</i> spaceship?",
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
                ...continue this format up to 6 responses
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
                ...continue this format up to 6 responses
              ]
            },
            ...continue this format up to 10 questions
          ]
         
          Please ensure variety in topics and complexity across the questions. And return only a complete JSON so that I can parse it.
          
          This is the course content:
          "${inputText}"
          `,
        },
      ],
      temperature: 0.7,
    });

    const res = response.choices.map(({ message }, i) => {
      const data = message.content.trim();
      this.saveToFile(data, `output/${runId}-${i}.json`);
      try {
        return JSON.parse(data) as GeneratedQuestion[];
      } catch (e) {
        log.error(e);
        return [];
      }
    });
    log.debug(`Generated questions: ${response.choices.length}`);
    return res.flat();
  }

  private saveToFile(data: string, fileName: string): void {
    const file = path.join(process.cwd(), fileName);
    if (!fs.existsSync(path.dirname(file))) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    fs.writeFileSync(file, data);
  }
}
