import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CreateOrderDto, OrderConfirmResponseDto } from './dto/order.dto';

describe('OrderController', () => {
  let controller: OrderController;

  const orderServiceMock = {
    createOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: orderServiceMock,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('должен передавать dto в OrderService.createOrder и возвращать результат', async () => {
      const dto: CreateOrderDto = {
        email: 'test@example.com',
        phone: '+7 (999) 999-99-99',
        tickets: [
          {
            film: 'film-id',
            session: 'session-id',
            daytime: '2025-12-05T12:00:00.000Z',
            row: 1,
            seat: 2,
            price: 350,
          },
        ],
      } as unknown as CreateOrderDto;

      const confirm: OrderConfirmResponseDto = {
        orderId: 'order-123',
        length: 1,
        total: 350,
        tickets: dto.tickets,
      } as unknown as OrderConfirmResponseDto;

      orderServiceMock.createOrder.mockResolvedValue(confirm);

      const result = await controller.create(dto);

      expect(orderServiceMock.createOrder).toHaveBeenCalledTimes(1);
      expect(orderServiceMock.createOrder).toHaveBeenCalledWith(dto);
      expect(result).toBe(confirm);
    });
  });
});
