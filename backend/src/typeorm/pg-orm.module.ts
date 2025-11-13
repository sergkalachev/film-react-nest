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
        const dbUrl = cfg.get<string>('DATABASE_URL') || '';
        let host: string | undefined;
        let port: number | undefined;
        let database: string | undefined;

        // читаем логин/пароль из переменных .env тестов
        let username = cfg.get<string>('DATABASE_USERNAME') || '';
        let password = cfg.get<string>('DATABASE_PASSWORD') || '';

        // парсим URL, чтобы достать host/port/db и, если есть, логин/пароль
        try {
          if (dbUrl) {
            const u = new URL(dbUrl);
            host = u.hostname || 'localhost';
            port = u.port ? Number(u.port) : 5432;
            database = u.pathname?.replace(/^\//, '') || undefined;
            if (u.username) username = decodeURIComponent(u.username);
            if (u.password) password = decodeURIComponent(u.password);
          }
        } catch {
          // игнорируем, если строка безвалидная — пусть останутся дефолты/переменные
        }

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
          retryAttempts: 50,
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
