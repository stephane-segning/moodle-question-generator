import { bindNodeCallback, map, switchMap } from 'rxjs';
import { CategoryTopic } from '../models/category-topic';
import * as fs from 'fs';
import * as csv from 'csv-parser';

const writeFileAsObservable = bindNodeCallback(fs.writeFile);

export const toFile = (outputFile: string) =>
  switchMap(([result, runId]: [string, string]) =>
    writeFileAsObservable(
      outputFile,
      '<?xml version="1.0" encoding="UTF-8"?>' + result,
    ).pipe(map(() => runId)),
  );

export const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

export const parseCsv = async (file: string) => {
  const results = [];
  const topics = await new Promise<CategoryTopic[]>((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(csv())
      .on('data', (data) => data && results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
  return topics.filter((t) => t.take === '1');
};

export const readFileAsObservable = bindNodeCallback(fs.readFile);
