//TODO реализовать DTO для /orders
// backend/src/order/dto/order.dto.ts
import {
  IsArray,
  IsEmail,
  IsNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Ticket из OpenAPI */
export class TicketDto {
  @IsUUID()
  film!: string; // d290f1ee-6c54-4b01-90e6-d701748f0851

  @IsUUID()
  session!: string; // 95ab4a20-9555-4a06-bfac-184b8c53fe70

  @IsString() // format: date-time
  daytime!: string; // '2023-05-29T10:30:00.001Z'

  @IsNumber()
  row!: number; // 2

  @IsNumber()
  seat!: number; // 5

  @IsNumber()
  price!: number; // 350
}

/** Тело запроса POST /order */
export class CreateOrderDto {
  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketDto)
  tickets!: TicketDto[];
}

/** Элемент ответа: Ticket + id */
export class OrderConfirmItemDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  film!: string;

  @IsUUID()
  session!: string;

  @IsString()
  daytime!: string;

  @IsNumber()
  row!: number;

  @IsNumber()
  seat!: number;

  @IsNumber()
  price!: number;
}

/** Ответ POST /order */
export class OrderConfirmResponseDto {
  @IsNumber()
  total!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderConfirmItemDto)
  items!: OrderConfirmItemDto[];
}
