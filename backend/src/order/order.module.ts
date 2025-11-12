import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { RepositoryModule } from '../repository/repository.module';

@Module({
  imports: [RepositoryModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
