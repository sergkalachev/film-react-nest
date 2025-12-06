import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/order.dto';

// чтобы randomUUID был детерминированным в тестах
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid'),
}));

describe('OrderService', () => {
  const createServiceWithRepo = (repo: any) => new OrderService(repo);

  it('должен группировать билеты по film:session, удалять дубли, вызывать reserveSeats и нормализовывать daytime', async () => {
    const repo = {
      getFilmAndSession: jest.fn().mockResolvedValue({
        film: { id: 'film-1' },
        session: { id: 'session-1' },
      }),
      reserveSeats: jest
        .fn()
        .mockResolvedValue({ updated: true, conflicts: [] }),
    };

    const service = createServiceWithRepo(repo);

    const dto: CreateOrderDto = {
      email: 'test@example.com',
      phone: '+7 (999) 999-99-99',
      tickets: [
        {
          film: 'film-1',
          session: 'session-1',
          daytime: ' 2025-12-05 ',
          row: 1,
          seat: 1,
          price: 300,
        },
        // полный дубль (film, session, row, seat) — должен быть проигнорирован
        {
          film: 'film-1',
          session: 'session-1',
          daytime: '2025-12-05',
          row: 1,
          seat: 1,
          price: 300,
        },
        // второй билет того же сеанса, без daytime — проверим 'null'
        {
          film: 'film-1',
          session: 'session-1',
          daytime: undefined as any,
          row: 1,
          seat: 2,
          price: 400,
        },
        // некорректный билет без film — должен быть проигнорирован
        {
          film: '' as any,
          session: 'session-1',
          daytime: '2025-12-05',
          row: 10,
          seat: 10,
          price: 999,
        },
      ],
    } as unknown as CreateOrderDto;

    const result = await service.createOrder(dto);

    // вытащили film+session один раз (одна группа)
    expect(repo.getFilmAndSession).toHaveBeenCalledTimes(1);
    expect(repo.getFilmAndSession).toHaveBeenCalledWith('film-1', 'session-1');

    // резервируем только уникальные места
    expect(repo.reserveSeats).toHaveBeenCalledTimes(1);
    expect(repo.reserveSeats).toHaveBeenCalledWith('film-1', 'session-1', [
      '1:1',
      '1:2',
    ]);

    // дубликат билета отфильтрован
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((i) => `${i.row}:${i.seat}`)).toEqual([
      '1:1',
      '1:2',
    ]);

    // daytime нормализован: trim + 'null' для пустых
    expect(result.items[0].daytime).toBe('2025-12-05');
    expect(result.items[1].daytime).toBe('null');

    // id берётся из randomUUID (мы замокали его)
    expect(result.items[0].id).toBe('test-uuid');
    expect(result.items[1].id).toBe('test-uuid');
  });

  it('должен возвращать пустой заказ, если фильм или сеанс не найдены', async () => {
    const repo = {
      getFilmAndSession: jest
        .fn()
        .mockResolvedValue({ film: null, session: null }),
      reserveSeats: jest.fn(),
    };

    const service = createServiceWithRepo(repo);

    const dto: CreateOrderDto = {
      email: 'test@example.com',
      phone: '+7 (999) 999-99-99',
      tickets: [
        {
          film: 'film-1',
          session: 'session-1',
          daytime: '2025-12-05',
          row: 1,
          seat: 1,
          price: 300,
        },
      ],
    } as unknown as CreateOrderDto;

    const result = await service.createOrder(dto);

    expect(repo.getFilmAndSession).toHaveBeenCalledTimes(1);
    expect(repo.reserveSeats).not.toHaveBeenCalled();

    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('не должен падать, если reserveSeats выбрасывает ошибку', async () => {
    const repo = {
      getFilmAndSession: jest.fn().mockResolvedValue({
        film: { id: 'film-1' },
        session: { id: 'session-1' },
      }),
      reserveSeats: jest.fn().mockRejectedValue(new Error('DB error')),
    };

    const service = createServiceWithRepo(repo);

    const dto: CreateOrderDto = {
      email: 'test@example.com',
      phone: '+7 (999) 999-99-99',
      tickets: [
        {
          film: 'film-1',
          session: 'session-1',
          daytime: '2025-12-05',
          row: 3,
          seat: 4,
          price: 500,
        },
      ],
    } as unknown as CreateOrderDto;

    const result = await service.createOrder(dto);

    // несмотря на ошибку при резервировании, заказ создаётся
    expect(repo.reserveSeats).toHaveBeenCalledTimes(1);
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      film: 'film-1',
      session: 'session-1',
      row: 3,
      seat: 4,
      price: 500,
    });
  });

  it('должен уметь получать фильм и сеанс через findSchedule + findAll', async () => {
    const repo = {
      findSchedule: jest.fn().mockResolvedValue({
        items: [{ id: 'session-1', filmId: 'film-1' }],
        total: 1,
      }),
      findAll: jest.fn().mockResolvedValue({
        items: [{ id: 'film-1' }],
        total: 1,
      }),
      reserveSeats: jest
        .fn()
        .mockResolvedValue({ updated: true, conflicts: [] }),
    };

    const service = createServiceWithRepo(repo);

    const dto: CreateOrderDto = {
      email: 'test@example.com',
      phone: '+7 (999) 999-99-99',
      tickets: [
        {
          film: 'film-1',
          session: 'session-1',
          daytime: '2025-12-05',
          row: 1,
          seat: 1,
          price: 300,
        },
      ],
    } as unknown as CreateOrderDto;

    const result = await service.createOrder(dto);

    expect(repo.findSchedule).toHaveBeenCalledTimes(1);
    expect(repo.findSchedule).toHaveBeenCalledWith('film-1');
    expect(repo.findAll).toHaveBeenCalledTimes(1);

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].film).toBe('film-1');
    expect(result.items[0].session).toBe('session-1');
  });
});
