import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const invalidParams = error.errors.map((err) => ({
          name: err.path.join('.'),
          reason: err.message,
        }));

        return res.status(422).contentType('application/problem+json').json({
          type: 'https://api.devflow.ai/errors/validation-error',
          title: 'Validation Failed',
          status: 422,
          detail: 'One or more fields in the request failed validation.',
          instance: req.originalUrl,
          invalidParams,
        });
      }
      next(error);
    }
  };
}
