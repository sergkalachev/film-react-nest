import { Module } from '@nestjs/common';
import { PgOrmModule } from './pg-orm.module';
import { PgFilmsRepository } from './pg-films.repository';

@Module({
  imports: [PgOrmModule],
  providers: [
    PgFilmsRepository,
    // единый DI-токен, на который ссылаются сервисы
    { provide: 'FILMS_REPOSITORY', useExisting: PgFilmsRepository },
  ],
  exports: ['FILMS_REPOSITORY'],
})
export class PgRepositoriesModule {}
