import { request } from 'undici';
import { loadConfig } from '../config/env';
import { outboundLimiter } from './outboundLimiter';
import type { ApiErrorCode } from '../models/api';

/** Represents an HTTP error raised while calling upstream services. */
export class HttpError extends Error {
  public status: number;
  public code: ApiErrorCode;
  public details?: unknown;

  constructor(code: ApiErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const config = loadConfig();

/** Builds the HTTP headers used for Audible requests. */
function buildHeaders() {
  return {
    'User-Agent': config.AUDIBLE_USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': config.AUDIBLE_ACCEPT_LANGUAGE,
  };
}

export type FetchHtmlOptions = {
  allowNotFound?: boolean;
};

/** Issues the HTTP request and returns the undici response. */
async function readResponseText(url: string) {
  return request(url, {
    headers: buildHeaders(),
    maxRedirections: 3,
    bodyTimeout: config.AUDIBLE_TIMEOUT_MS,
    headersTimeout: config.AUDIBLE_TIMEOUT_MS,
  });
}

/** Validates response status codes and throws structured HttpError instances. */
function handleStatus(statusCode: number, options: FetchHtmlOptions) {
  if (statusCode === 404 && options.allowNotFound) {
    throw new HttpError('NOT_FOUND', 'Audible returned 404', 404);
  }

  if (statusCode >= 400) {
    const code: ApiErrorCode = 'UPSTREAM_ERROR';
    throw new HttpError(code, `Audible responded with status ${statusCode}`, 502, {
      statusCode,
    });
  }
}

/** Fetches HTML from Audible with rate limiting and error handling. */
export async function fetchHtml(url: string, options: FetchHtmlOptions = {}): Promise<string> {
  return outboundLimiter.schedule(async () => {
    const response = await readResponseText(url);
    const { statusCode, body } = response;
    const text = await body.text();

    handleStatus(statusCode, options);
    return text;
  });
}
