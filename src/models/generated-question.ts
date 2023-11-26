export interface GeneratedQuestion {
  n: string;
  r: GeneratedResponse[];
}

export interface GeneratedResponse {
  n: string;
  e: string;
  t: number;
}
