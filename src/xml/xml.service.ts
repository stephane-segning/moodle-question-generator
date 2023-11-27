import { Injectable, Logger } from '@nestjs/common';
import { XMLBuilder } from 'fast-xml-parser';
import { Question } from '../models/question';

const log = new Logger('XmlService');

@Injectable()
export class XmlService {
  private readonly builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    cdataPropName: 'cdata',
  });

  constructor() {}

  public toXml(questions: Question[], tags?: string[]): string {
    log.debug('Generating XML...');
    return this.builder.build({
      quiz: {
        question: questions
          .filter((q) => q.answers.length > 1)
          .map(({ question, answers, name, single }) => ({
            '@_type': 'multichoice',
            name: {
              text: name,
            },
            questiontext: {
              '@_format': 'html',
              text: {
                cdata: question,
              },
            },
            answer: answers.map(({ answer, feedback, fraction }) => ({
              '@_format': 'html',
              '@_fraction': fraction,
              text: {
                cdata: answer,
              },
              feedback: {
                '@_format': 'html',
                text: {
                  cdata: feedback,
                },
              },
            })),
            tags:
              tags.length === 0
                ? undefined
                : {
                    tag: tags.map((tag) => ({
                      text: tag,
                    })),
                  },
            shuffleanswers: true,
            single,
            answernumbering: 'abc',
            correctfeedback: {
              '@_format': 'html',
              text: {
                cdata: 'Your answer is correct.',
              },
            },
            partiallycorrectfeedback: {
              '@_format': 'html',
              text: {
                cdata: 'Your answer is partially correct.',
              },
            },
            incorrectfeedback: {
              '@_format': 'html',
              text: {
                cdata: 'Your answer is incorrect.',
              },
            },
          })),
      },
    });
  }
}
