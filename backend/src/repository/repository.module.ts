import { Module } from '@nestjs/common';
import { FilmsRepository } from './films.repository';

// Postgres-реализация и модуль подключения к PG
import { PgFilmsRepository } from '../typeorm/pg-films.repository';
import { PgOrmModule } from '../typeorm/pg-orm.module';

@Module({
  imports: [
    // подключаем TypeORM только когда включён postgres
    ...(process.env.DATABASE_DRIVER === 'postgres' ? [PgOrmModule] : []),
  ],
  providers: [
    process.env.DATABASE_DRIVER === 'postgres'
      ? { provide: FilmsRepository, useClass: PgFilmsRepository }
      : FilmsRepository,
  ],
  exports: [FilmsRepository],
})
export class RepositoryModule {}
