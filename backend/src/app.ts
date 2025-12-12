import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './utils/env';
import { authenticateUser, optionalAuthenticate, AuthenticatedRequest } from './middleware/auth';

import { userRoutes, conversationRoutes, chatRoutes } from './routes';

const app: Application = express();

app.use(helmet());

const corsOptions = {
  origin: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
};
app.use(cors(corsOptions));

app.use(morgan('combined'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/status', (_req: Request, res: Response) => {
  res.json({
    message: 'Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/v1/protected', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    message: 'You have access to this protected route',
    user: req.user,
  });
});

app.get('/api/v1/optional-auth', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    message: 'This route works with or without authentication',
    user: req.user || null,
    authenticated: !!req.user,
  });
});

app.use('/api/v1/user', userRoutes);
app.use('/api/v1/conversations', conversationRoutes);

app.use('/api/chat', chatRoutes);
app.use('/api/v1/chat', chatRoutes);

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Backend API Server',
    docs: '/api/v1/docs',
    health: '/health',
  });
});

app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${_req.originalUrl} does not exist`,
  });
});

interface CustomError extends Error {
  statusCode?: number;
  status?: number;
}

const errorHandler = (
  error: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });

  let statusCode = 500;
  let message = 'Internal Server Error';

  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not Found';
  } else if (error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.status) {
    statusCode = error.status;
    message = error.message;
  }

  const isDevelopment = env.NODE_ENV === 'development';

  res.status(statusCode).json({
    error: message,
    ...(isDevelopment && { stack: error.stack, details: error.message }),
    ...(!isDevelopment && statusCode === 500 && { message: 'Something went wrong' }),
  });
};

app.use(errorHandler);

export default app;
