import { app } from './app';
import { loadConfig } from './config/env';

const config = loadConfig();

app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${config.PORT}`);
  // eslint-disable-next-line no-console
  console.log(`Rate limit enabled: ${config.API_RATE_LIMIT_ENABLED ? 'yes' : 'no'}`);
  // eslint-disable-next-line no-console
  console.log(`Redis cache enabled: ${config.REDIS_ENABLED ? 'yes' : 'no'}`);
});
