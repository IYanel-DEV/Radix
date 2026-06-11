import { Injectable, ValidationPipe as NestValidationPipe, BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

@Injectable()
export class ValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) => {
        const messages = errors.map((error) => {
          if (error.constraints) {
            return Object.values(error.constraints).join(', ');
          }
          if (error.children?.length) {
            return error.children.map((child) => {
              if (child.constraints) {
                return Object.values(child.constraints).join(', ');
              }
              return JSON.stringify(child);
            }).join('; ');
          }
          return 'Validation failed';
        });
        return new BadRequestException(messages);
      },
    });
  }
}
