import { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '../services/api-key-service.js';

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  const userId = await validateApiKey(token);

  if (!userId) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  req.userId = userId;
  next();
}

export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const userId = await validateApiKey(token);
    if (userId) {
      req.userId = userId;
    }
  }

  next();
}
