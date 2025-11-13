import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Film } from '../entities/film.entity';
import { Schedule } from '../entities/schedule.entity';
import { join } from 'path';

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

        let username = cfg.get<string>('DATABASE_USERNAME') || '';
        let password = cfg.get<string>('DATABASE_PASSWORD') || '';

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
          // если DATABASE_URL кривой — используем дефолты/остальные переменные
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
          migrationsRun: true,
          migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
          retryAttempts: 40,
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
