import express from 'express';
import { healthRouter } from './routes/health';
import { searchRouter } from './routes/search';
import { detailsRouter } from './routes/details';
import { findRouter } from './routes/find';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimitMiddleware } from './middleware/rateLimit';
import swaggerUi from 'swagger-ui-express';
import { buildSwaggerSpec } from './docs/swagger';

export const app = express();

app.use(requestLogger);
app.use(rateLimitMiddleware);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(buildSwaggerSpec()));

app.use(healthRouter);
app.use(searchRouter);
app.use(detailsRouter);
app.use(findRouter);

app.use(errorHandler);
