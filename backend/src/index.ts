import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './utils/env';
import { authenticateUser, optionalAuthenticate, AuthenticatedRequest } from './middleware/auth';

// Import routes
import { userRoutes, conversationRoutes } from './routes';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: env.CORS_ORIGINS.split(',').map(origin => origin.trim()),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
};
app.use(cors(corsOptions));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check routes
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

// API routes
app.get('/api/v1/status', (_req: Request, res: Response) => {
  res.json({
    message: 'Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Example protected route
app.get('/api/v1/protected', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    message: 'You have access to this protected route',
    user: req.user,
  });
});

// Example optional auth route
app.get('/api/v1/optional-auth', optionalAuthenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    message: 'This route works with or without authentication',
    user: req.user || null,
    authenticated: !!req.user,
  });
});

// Mount API routes
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/conversations', conversationRoutes);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Backend API Server',
    docs: '/api/v1/docs',
    health: '/health',
  });
});

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${_req.originalUrl} does not exist`,
  });
});

// Global error handling middleware
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

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Handle specific error types
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

  // Don't expose internal error details in production
  const isDevelopment = env.NODE_ENV === 'development';
  
  res.status(statusCode).json({
    error: message,
    ...(isDevelopment && { stack: error.stack, details: error.message }),
    ...(!isDevelopment && statusCode === 500 && { message: 'Something went wrong' }),
  });
};

// Register error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = parseInt(env.PORT, 10);

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API status: http://localhost:${PORT}/api/v1/status`);
  console.log(`🔒 Environment: ${env.NODE_ENV}`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  // Force close server after 30s
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default app;