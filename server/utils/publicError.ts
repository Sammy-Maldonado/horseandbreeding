// Safe public error contract (HOR-78, extended by HOR-96). Handlers throw a
// PublicError for messages that are meant for the end user; anything else that
// escapes is an internal error and must reach the client only as a fixed
// generic message — never the raw ORM/driver text (CLAUDE.md §7).
//
// This module stays free of `h3` on purpose: it is the decision layer, so the
// plain Node vitest project can exercise it exhaustively. The handler turns the
// decision into a real response with `createError` (HOR-96), which is what
// makes the transport status truthful instead of a 200 carrying a failure body.

/**
 * An error whose message is safe to show the client, carrying the HTTP status
 * that failure deserves. 400 is the default because most of them are malformed
 * or incomplete input.
 */
export class PublicError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "PublicError";
    this.statusCode = statusCode;
  }
}

/**
 * The 400 case, kept under its original name so the sign-up path HOR-78
 * introduced keeps reading the way it did.
 */
export class ValidationError extends PublicError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

export interface PublicErrorResponse {
  statusCode: number;
  message: string;
  statusMessage: string;
}

// `statusMessage` carries the text the frontend already displays, and `message`
// keeps the value the previous body had, so the response body a client reads is
// unchanged — only the transport status becomes truthful.
export function toPublicErrorResponse(error: unknown): PublicErrorResponse {
  if (error instanceof PublicError) {
    return {
      statusCode: error.statusCode,
      message: "Internal server error..!",
      statusMessage: error.message
    };
  }

  // A failure the server caused is not a bad client request (HOR-96).
  return {
    statusCode: 500,
    message: "Internal server error..!",
    statusMessage: "Bad request"
  };
}
