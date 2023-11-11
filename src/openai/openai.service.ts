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
          Hello, as a pro-skilled and funny educator with years of experience, imagine your ability to teach complex subjects in an engaging and humorous way is outstanding. 
          Your task is to embody the role of a seasoned teacher, adept at creating educational and entertaining questions. 
          When presented with course content, use your advanced skills to generate a list of questions that assess students' understanding of the material. 
          Aim for questions that are thought-provoking, yet accessible, blending your expertise with a touch of humor to make learning enjoyable. 
          Your questions should cater to different levels of understanding, encouraging deep thinking and retention. 
          Let's make the learning experience both fun and effective! Provide question directly please if asked. 
          Format the questions using html and the question list item using "@##_$index" for clarity.
          Example: 
          @##_1. [First question] 
          @##_2. [Second question] ...
          
          
          This is the course content:
          "${inputText}"
          `,
        },
      ],
      n,
      temperature: 0.7,
    });

    const res = response.choices
      .map(({ message }) =>
        message.content
          .split('\n')
          .filter((s) => s.startsWith('@##_'))
          .map((s) => s.substring(6).trim()),
      )
      .flat();
    log.debug(`Generated questions: ${response.choices.length}`);
    return res;
  }

  async generateGoodFeedback(
    question: string,
    model: string,
    n = 2,
  ): Promise<string[]> {
    log.debug(
      `Generating good feedback for question: ${question.substring(0, 10)}...`,
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
          Hello, as a pro-skilled and funny educator with years of experience, imagine your ability to explain complex subjects in an engaging and humorous way is outstanding. 
          Your task now is to embody the role of a seasoned teacher, adept at providing clear, informative, and accurate answers. 
          When presented with a specific question, use your advanced skills to generate a well-thought-out answer that comprehensively addresses the query. 
          Your answers should be insightful and informative, blending your expertise with a touch of humor to make the explanation enjoyable. 
          The answers should cater to different levels of understanding, ensuring they are accessible yet detailed enough to encourage deep thinking and retention. 
          Please format the answers in either html or plaintext. Our goal is to make the learning experience both fun and effective! Provide the answer directly, if asked. 
          Use the format "@##_Answer_Index" for clarity in listing these answers. 
          For example: 
          @##_1. [Answer N°1 to Question] 
          @##_2. [Answer N°2 to Question] ...
          
          This is the question:
          "${question}"
        `,
        },
      ],
      n,
      temperature: 0.7,
    });

    const res = response.choices
      .map(({ message }) =>
        message.content
          .split('\n')
          .filter((s) => s.startsWith('@##_'))
          .map((s) => s.substring(6).trim()),
      )
      .flat();
    log.debug(`Generated good feedback: ${response.choices.length}`);
    return res;
  }

  async generateBadFeedback(
    question: string,
    model: string,
    n = 4,
  ): Promise<string[]> {
    log.debug(
      `Generating bad feedback for question: ${question.substring(0, 10)}...`,
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
          Hello, as a seasoned teacher in Computer Science known for your unconventional approach, imagine your task is to teach complex subjects in a way that intentionally incorporates elements of misinformation or humorously misleading content. 
          Your role is to create answers for question that appear educational but actually contain elements of misinformation or misleading concepts, blending this approach with a touch of humor to make the experience uniquely challenging. 
          When presented with the following content, use your skills to generate a list of such bad feedbacks that deliberately twist or misinterpret the material. 
          Aim for response that provoke thought in an unconventional manner, misleadingly steering away from the actual facts. 
          Your questions should cater to this unique approach, encouraging learners to identify and question the misleading elements. 
          Please generate ${n} bad response for this question.
          Format the response in html, using "@##_$index" for each response for clarity. 
          For example: 
          @##_1. [First misleading answer] 
          @##_2. [Second misleading answer] ...
          
          This is the question:
          "${question}"
        `,
        },
      ],
      n: n,
      temperature: 0.7,
    });

    const feedbacks = response.choices
      .map(({ message }) =>
        message.content
          .split('\n')
          .filter((s) => s.startsWith('@##_'))
          .map((s) => s.substring(6).trim()),
      )
      .flat();
    log.debug(`Generated bad feedback: ${feedbacks.length}`);
    return feedbacks;
  }

  async generateFeedback(
    question: string,
    answer: string,
    model: string,
  ): Promise<string> {
    log.debug(
      `Generating feedback for question: ${question.substring(
        0,
        10,
      )}... and answer: ${answer.substring(0, 10)}...`,
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
          Hello, as a pro-skilled and funny educator with years of experience, imagine your ability to critically analyze responses to complex subjects in an engaging and humorous way is outstanding. 
          Your task is to embody the role of a seasoned teacher, adept at providing insightful feedback on answers given to educational questions. 
          When presented with a specific question and an answer, use your advanced skills to generate detailed feedback on the answer. 
          Your feedback should assess the accuracy, completeness, and clarity of the answer, providing suggestions for improvement if necessary. 
          Blend your expertise with a touch of humor to make the feedback constructive and enjoyable. 
          The feedback should cater to different levels of understanding, encouraging deeper insight and learning. 
          Please format the feedback in either html or plaintext. Our aim is to make the learning process both fun and effective! Provide the feedback directly, if asked. 
          Provide only one feedback please.
          
          This is the question:
          "${question}"
          
          And this is the answer provided:
          "${answer}" 
    `,
        },
      ],
      n: 1,
      temperature: 0.7,
    });

    const res = response.choices[0].message.content.trim();
    log.debug(`Generated feedback: ${res}`);
    return res;
  }

  async generateName(question: string, model: string): Promise<string> {
    log.debug(`Generating name for question: ${question.substring(0, 10)}...`);
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
          Hello, as a pro-skilled and funny educator with years of experience, imagine your ability to engage audiences with complex subjects in an entertaining way. 
          Your task is to use your expertise as a seasoned teacher to create concise, memorable names for educational questions. 
          When presented with a specific question, apply your skills to distill its essence into a short, catchy title that captures the core concept or challenge of the question. 
          These titles should be thought-provoking and engaging, blending your expertise with a touch of humor to make the learning experience enjoyable. 
          Your titles should cater to different levels of understanding, encouraging deep thinking and retention. 
          Please format the question titles in plaintext. We aim to make learning both fun and effective! Provide the question title directly, if asked.
          Provide only one title please.
          
          This is the question:
          "${question}"
        `,
        },
      ],
      n: 1,
      temperature: 0.7,
    });

    const res = response.choices[0].message.content.trim();
    log.debug(`Generated name: ${res}`);
    return res;
  }
}
