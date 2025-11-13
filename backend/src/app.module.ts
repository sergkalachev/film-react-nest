import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { configProvider } from './app.config.provider';
import { MongooseModule } from '@nestjs/mongoose';

import { FilmsModule } from './films/films.module';
import { OrderModule } from './order/order.module';

import { RepositoryModule } from './repository/repository.module';
import { PgOrmModule } from './typeorm/pg-orm.module';
import { PgRepositoriesModule } from './typeorm/pg-repositories.module';

const isMongo =
  process.env.DATABASE_DRIVER?.toLowerCase() === 'mongodb' ||
  /^mongodb(\+srv)?:\/\//.test(process.env.DATABASE_URL ?? '');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public', 'images'),
      serveRoot: '/content/afisha',
      serveStaticOptions: {
        index: 'bg1s.jpg', // чтобы GET /content/afisha/ вернул картинку
      },
    }),

    ...(isMongo
      ? [MongooseModule.forRoot(process.env.DATABASE_URL!), RepositoryModule]
      : [PgOrmModule, PgRepositoriesModule]),

    ServeStaticModule.forRoot(
      {
        rootPath: join(__dirname, '..', 'public', 'images'),
        serveRoot: '/content/afisha',
        exclude: ['/api*'],
        serveStaticOptions: { fallthrough: true },
      },
      {
        rootPath: join(__dirname, '..', 'public'),
        serveRoot: '/content/afisha',
        exclude: ['/api*'],
        serveStaticOptions: { index: false },
      },
    ),

    FilmsModule,
    OrderModule,
  ],
  controllers: [],
  providers: [configProvider],
})
export class AppModule {}
