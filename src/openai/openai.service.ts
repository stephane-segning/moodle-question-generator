import { Injectable, Logger } from '@nestjs/common';
import OpenAIApi from 'openai';

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
    inputText: string,
    model: string,
    n = 2,
  ): Promise<string[]> {
    log.debug(`Generating questions for input: ${inputText}`);
    const response = await this.openai.completions.create({
      model,
      prompt: `
    Imagine you are a teacher and you are teaching a class. You want to make sure they understand the material. You ask them questions to see if they understand the material. The material is:
    "${inputText}"
  
    Please generate a list of questions you would ask the class to see if they understand the material. 
    You can use the following format: html, plaintext
    `,
      max_tokens: 150,
      n,
      stop: ['\n'],
      temperature: 0.7,
    });
    log.debug(`Generated questions: ${response.choices.length}`);
    return response.choices.map(({ text }) => text.trim());
  }

  async generateGoodFeedback(
    question: string,
    model: string,
    n = 2,
  ): Promise<string[]> {
    log.debug(`Generating good feedback for question: ${question}`);
    const response = await this.openai.completions.create({
      model,
      prompt: `
    Imagine you are a teacher and you are teaching a class. You want to make sure they understand the material. You ask them questions to see if they understand the material. The question is:
    "${question}"
  
    Please generate a good and complete answer for this question.
    You can use the following format: plaintext
    `,
      max_tokens: 50,
      n: n,
      stop: ['\n'],
      temperature: 0.7,
    });

    log.debug(`Generated good feedback: ${response.choices.length}`);
    return response.choices.map(({ text }) => text.trim());
  }

  async generateBadFeedback(
    question: string,
    model: string,
    n = 4,
  ): Promise<string[]> {
    log.debug(`Generating bad feedback for question: ${question}`);
    const response = await this.openai.completions.create({
      model,
      prompt: `
      Imagine you are a teacher and you are teaching a class. You want to make sure they understand the material. You ask them questions to see if they understand the material. The question is:
    "${question}"
  
    Please generate a bad and misleading answer for this question. 
    You can use the following format: plaintext
    `,
      max_tokens: 50,
      n: n,
      stop: ['\n'],
      temperature: 0.7,
    });

    const feedbacks = response.choices.map(({ text }) => text.trim());
    log.debug(`Generated bad feedback: ${feedbacks.length}`);
    return feedbacks;
  }

  async generateFeedback(
    question: string,
    answer: string,
    model: string,
  ): Promise<string> {
    log.debug(`Generating feedback for question: ${question}`);
    const response = await this.openai.completions.create({
      model,
      prompt: `
      Imagine you are a teacher and you are teaching a class. You want to make sure they understand the material. You ask them questions to see if they understand the material. 
      
      The question is:
      "${question}"
      
      The answer is:
      "${answer}"
  
      Please generate a clear feedback for this answer. If it's wrong, please explain why it's wrong. If it's correct, please explain why it's correct.
      You can use the following format: plaintext 
    `,
      max_tokens: 50,
      n: 1,
      stop: ['\n'],
      temperature: 0.7,
    });

    const res = response.choices[0].text.trim();
    log.debug(`Generated feedback: ${res}`);
    return res;
  }

  async generateName(question: string, model: string): Promise<string> {
    log.debug(`Generating name for question: ${question}`);
    const response = await this.openai.completions.create({
      model,
      prompt: `
      Imagine you are a teacher and you are teaching a class. You want to make sure they understand the material. You ask them questions to see if they understand the material. 
      
      The question is:
      "${question}"
      
      Please generate a small name for this question. 
      You can use the following format: plaintext
    `,
      max_tokens: 50,
      n: 1,
      stop: ['\n'],
      temperature: 0.7,
    });

    const res = response.choices[0].text.trim();
    log.debug(`Generated name: ${res}`);
    return res;
  }
}
