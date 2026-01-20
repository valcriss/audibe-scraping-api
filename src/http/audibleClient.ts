import { request } from 'undici';
import { loadConfig } from '../config/env';
import { outboundLimiter } from './outboundLimiter';
import type { ApiErrorCode } from '../models/api';

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

async function readResponseText(url: string) {
  return request(url, {
    headers: buildHeaders(),
    maxRedirections: 3,
    bodyTimeout: config.AUDIBLE_TIMEOUT_MS,
    headersTimeout: config.AUDIBLE_TIMEOUT_MS,
  });
}

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

export async function fetchHtml(url: string, options: FetchHtmlOptions = {}): Promise<string> {
  return outboundLimiter.schedule(async () => {
    const response = await readResponseText(url);
    const { statusCode, body } = response;
    const text = await body.text();

    handleStatus(statusCode, options);
    return text;
  });
}
