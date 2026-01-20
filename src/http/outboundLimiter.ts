import Bottleneck from 'bottleneck';
import { loadConfig } from '../config/env';

const config = loadConfig();

export const outboundLimiter = new Bottleneck({
  maxConcurrent: config.OUTBOUND_CONCURRENCY,
  minTime: config.OUTBOUND_MIN_TIME_MS,
});
