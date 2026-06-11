import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const port = parseInt(process.env.PORT, 10) || 3001;
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

  app.setGlobalPrefix('api');

  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.log(`→ ${req.method} ${req.originalUrl} from ${req.ip}`);
    next();
  });

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  app.use(helmet.default({
    contentSecurityPolicy: false,
  }));

  app.use(
    rateLimit.default({
      windowMs: 60 * 1000,
      max: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor(), new LoggingInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Game Server Manager API')
    .setDescription('API for managing game servers')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Roles', 'Role and permission management')
    .addTag('Servers', 'Game server management')
    .addTag('Players', 'Player management')
    .addTag('Bans', 'Ban management')
    .addTag('Admin', 'Administrative operations')
    .addTag('Metrics', 'Metrics and monitoring')
    .addTag('Logs', 'Server logs')
    .addTag('Uploads', 'File uploads and builds')
    .addTag('Configuration', 'Server configuration')
    .addTag('Audit', 'Audit logs')
    .addTag('Notifications', 'Notifications')
    .addTag('Deployment', 'Deployment management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  if (process.env.PROMETHEUS_ENABLED === 'true') {
    const { metricsHandler } = await import('./modules/metrics/metrics.service');
    app.use('/metrics', metricsHandler);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`Application running on port ${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  logger.log(`Metrics available at http://localhost:${port}/metrics`);
}

bootstrap();
