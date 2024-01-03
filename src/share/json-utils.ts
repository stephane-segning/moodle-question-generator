import { jsonrepair } from 'jsonrepair';

export const parseDataToJson = <T>(data: string): T => {
  const repaired = jsonrepair(data);
  return JSON.parse(repaired) as T;
};
