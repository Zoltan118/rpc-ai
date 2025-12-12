import { env } from './utils/env';
import app from './app';

const PORT = env.PORT;

if (env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`📋 API status: http://localhost:${PORT}/api/v1/status`);
    console.log(`🔒 Environment: ${env.NODE_ENV}`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

export default app;
