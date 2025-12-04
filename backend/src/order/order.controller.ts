import { Body, Controller, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto, OrderConfirmResponseDto } from './dto/order.dto';

@Controller('order') // /api/afisha/order
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() dto: CreateOrderDto): Promise<OrderConfirmResponseDto> {
    return this.orderService.createOrder(dto);
  }
}
