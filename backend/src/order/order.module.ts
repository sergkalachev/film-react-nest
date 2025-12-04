import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

import { PgRepositoriesModule } from '../typeorm/pg-repositories.module';
import { RepositoryModule } from '../repository/repository.module';

const isMongo =
  process.env.DATABASE_DRIVER?.toLowerCase() === 'mongodb' ||
  /^mongodb(\+srv)?:\/\//.test(process.env.DATABASE_URL ?? '');

const RepoModule = isMongo ? RepositoryModule : PgRepositoriesModule;

@Module({
  imports: [RepoModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
