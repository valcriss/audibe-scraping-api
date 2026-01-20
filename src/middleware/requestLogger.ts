import pinoHttp from 'pino-http';

export const requestLogger = pinoHttp({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});
