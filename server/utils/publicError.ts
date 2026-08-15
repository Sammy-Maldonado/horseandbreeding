// Safe public error contract (HOR-78). Handlers throw ValidationError for
// messages that are meant for the end user; anything else that escapes is an
// internal error and must reach the client only as a fixed generic message —
// never the raw ORM/driver text (CLAUDE.md §7).

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface PublicErrorResponse {
  statusCode: number;
  message: string;
  statusMessage: string;
}

// Response shape mirrors the existing catch block in login.post.ts so the
// frontend contract does not change.
export function toPublicErrorResponse(error: unknown): PublicErrorResponse {
  return {
    statusCode: 400,
    message: "Internal server error..!",
    statusMessage:
      error instanceof ValidationError ? error.message : "Bad request"
  };
}
