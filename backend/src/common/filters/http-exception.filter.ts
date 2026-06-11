import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response, Request } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[] = exception.message;

    if (typeof exceptionResponse === 'object') {
      const resp = exceptionResponse as Record<string, any>;
      message = resp.message || exception.message;
    }

    const errorResponse = {
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      error: exception.name,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.warn(`${request.method} ${request.url} -> ${status}: ${JSON.stringify(message)}`);

    response.status(status).json(errorResponse);
  }
}
