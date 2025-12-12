import { Request, Response, NextFunction } from 'express';

// Raw body parser middleware for webhook verification
export function rawBodyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.path === '/api/webhooks/stripe') {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      (req as any).rawBody = Buffer.from(data);
      next();
    });
  } else {
    next();
  }
}
