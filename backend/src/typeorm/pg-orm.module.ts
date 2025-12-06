// backend/src/typeorm/pg-orm.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Film } from '../entities/film.entity';
import { Schedule } from '../entities/schedule.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const url = cfg.get<string>('DATABASE_URL') ?? '';
        const parsed = url ? new URL(url) : null;

        const username =
          cfg.get<string>('DATABASE_USERNAME') ||
          parsed?.username ||
          'postgres';

        const password =
          cfg.get<string>('DATABASE_PASSWORD') ||
          parsed?.password ||
          'postgres';

        const database = parsed?.pathname?.replace(/^\//, '') || 'prac';

        const host = parsed?.hostname || 'localhost';
        const port = parsed?.port ? Number(parsed.port) : 5432;

        return {
          type: 'postgres' as const,
          host,
          port,
          database,
          username,
          password,
          autoLoadEntities: true,
          synchronize: false,
          logging: ['error', 'warn'],
          retryAttempts: 30,
          retryDelay: 3000,
          keepConnectionAlive: true,
        };
      },
    }),
    TypeOrmModule.forFeature([Film, Schedule]),
  ],
  exports: [TypeOrmModule],
})
export class PgOrmModule {}
