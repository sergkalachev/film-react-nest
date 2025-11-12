import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PgRepositoriesModule } from '../typeorm/pg-repositories.module';

@Module({
  imports: [PgRepositoriesModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
