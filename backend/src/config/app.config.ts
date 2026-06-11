export const appConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '', 10) || 3001,
  host: process.env.HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? '', 10) || 524288000,
  encryptionKey: process.env.ENCRYPTION_KEY || 'encryption-key-32-chars-long-for-aes!',
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
};
