/** An error with a user-friendly message and an HTTP status. Safe to use in the browser and on the server. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
