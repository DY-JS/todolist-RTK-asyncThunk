export type ResponseType<D = {}> = {
  resultCode: number;
  messages: Array<string>;
  data: D;
};

export enum ResultCode {
  Success = 0,
  Error = 1,
  Captcha = 10,
}
