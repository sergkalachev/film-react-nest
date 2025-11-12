import { Global, Module } from '@nestjs/common';
import { PgOrmModule } from './pg-orm.module';
import { PgFilmsRepository } from './pg-films.repository';

import { FilmsRepository } from '../repository/films.repository';

@Global()
@Module({
  imports: [PgOrmModule],
  providers: [
    ...(process.env.DATABASE_DRIVER === 'postgres'
      ? [{ provide: FilmsRepository, useClass: PgFilmsRepository }]
      : []),
  ],
  exports: [FilmsRepository],
})
export class PgRepositoriesModule {}
