//TODO реализовать DTO для /orders
// backend/src/order/dto/order.dto.ts
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/** Ticket из OpenAPI */
export class TicketDto {
  @IsUUID()
  film!: string; // d290f1ee-6c54-4b01-90e6-d701748f0851

  @IsUUID()
  session!: string; // 95ab4a20-9555-4a06-bfac-184b8c53fe70

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === 'null' || value === null ? undefined : String(value),
  )
  daytime?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  row!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  seat!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;
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

export class OrderConfirmItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  film!: string;

  @IsUUID()
  session!: string;

  @IsOptional()
  @IsString()
  daytime?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  row!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  seat!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;
}

export class OrderConfirmResponseDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  total!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderConfirmItemDto)
  items!: OrderConfirmItemDto[];
}
