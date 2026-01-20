import type { Request, Response } from 'express';
import { errorHandler } from '../src/middleware/errorHandler';
import { HttpError } from '../src/http/audibleClient';

describe('errorHandler', () => {
  const req = {} as Request;

  function createRes() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    return res;
  }

  it('handles HttpError', () => {
    const res = createRes();
    const err = new HttpError('UPSTREAM_ERROR', 'bad gateway', 502, { statusCode: 502 });
    errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UPSTREAM_ERROR', message: 'bad gateway', details: { statusCode: 502 } },
    });
  });

  it('handles Error', () => {
    const res = createRes();
    errorHandler(new Error('boom'), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'PARSING_ERROR', message: 'boom' },
    });
  });

  it('handles Error with empty message', () => {
    const res = createRes();
    errorHandler(new Error(''), req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'PARSING_ERROR', message: 'Unexpected error' },
    });
  });

  it('handles unknown error', () => {
    const res = createRes();
    errorHandler('nope', req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'PARSING_ERROR', message: 'Unknown error' },
    });
  });
});
