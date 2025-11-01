import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Включаем встроенный CORS NestJS
  app.enableCors({
    origin: 'http://localhost:5173', // разрешаем фронтенд
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Глобальный префикс для всех эндпоинтов
  app.setGlobalPrefix('api/afisha');

  // Порт 4000 — чтобы совпадал с VITE_API_URL
  await app.listen(4000);

  console.log('Server is running on http://localhost:4000/api/afisha');
}
bootstrap();
