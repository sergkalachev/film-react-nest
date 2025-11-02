import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { configProvider } from './app.config.provider';
import { MongooseModule } from '@nestjs/mongoose';

import { FilmsModule } from './films/films.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    //MongoDB подключение
    MongooseModule.forRoot(process.env.DATABASE_URL),
    //Раздача статических файлов
    ServeStaticModule.forRoot(
      // 1) Сначала ищем файл в /public/images  → /content/afisha/<file>
      {
        rootPath: join(__dirname, '..', 'public', 'images'),
        serveRoot: '/content/afisha',
        exclude: ['/api*'],
        // если файла нет в images — пропускаем дальше (к следующему static)
        serveStaticOptions: { fallthrough: true },
      },
      // 2) Остальное обслуживаем из /public (без index.html)
      {
        rootPath: join(__dirname, '..', 'public'),
        serveRoot: '/content/afisha',
        exclude: ['/api*'],
        serveStaticOptions: { index: false },
      },
    ),
    FilmsModule,
    OrderModule,
    // @todo: Добавьте раздачу статических файлов из public
  ],
  controllers: [],
  providers: [configProvider],
})
export class AppModule {}
