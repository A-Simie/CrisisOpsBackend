import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors.js';

type ValidationTarget = 'body' | 'query' | 'params';

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate = (schemas: ValidationSchemas) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: Record<string, string> = {};

    const targets: ValidationTarget[] = ['body', 'query', 'params'];

    for (const target of targets) {
      const schema = schemas[target];
      if (!schema) continue;

      try {
        const data = req[target];
        const parsed = schema.parse(data);
        req[target] = parsed;
      } catch (error) {
        if (error instanceof ZodError) {
          for (const err of error.errors) {
            const path = `${target}.${err.path.join('.')}`;
            errors[path] = err.message;
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      next(new BadRequestError('Validation failed', errors));
      return;
    }

    next();
  };
};

export const validateBody = <T>(schema: ZodSchema<T>) => validate({ body: schema });
export const validateQuery = <T>(schema: ZodSchema<T>) => validate({ query: schema });
export const validateParams = <T>(schema: ZodSchema<T>) => validate({ params: schema });
