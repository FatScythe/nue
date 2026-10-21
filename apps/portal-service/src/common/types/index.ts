export interface CustomResponse<T> {
  status: 'successful' | 'failed';
  message: (string & {}) | 'request successful';
  data: T;
  meta: Record<string, any> | null;
}
