export interface Question {
  answers: Answer[];
  name: string;
  question: string;
  single: boolean;
}

export interface Answer {
  answer: string;
  feedback: string;
  fraction: number;
}
