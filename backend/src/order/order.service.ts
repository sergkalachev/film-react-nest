import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FilmsRepository } from '../repository/films.repository';
import {
  CreateOrderDto,
  OrderConfirmItemDto,
  OrderConfirmResponseDto,
  TicketDto,
} from './dto/order.dto';
import { randomUUID } from 'crypto';

type GroupKey = `${string}:${string}`; // filmId:sessionId

@Injectable()
export class OrderService {
  constructor(private readonly repo: FilmsRepository) {}

  async createOrder(dto: CreateOrderDto): Promise<OrderConfirmResponseDto> {
    if (!dto.tickets?.length) {
      throw new BadRequestException('tickets array is required');
    }

    // уберём повторы в самом запросе (на один и тот же seat)
    const seen = new Set<string>();
    for (const t of dto.tickets) {
      this.assertTicketBasics(t);
      const key = `${t.film}|${t.session}|${t.row}:${t.seat}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `Duplicate seat in request: ${t.row}:${t.seat}`,
        );
      }
      seen.add(key);
    }

    // сгруппируем по фильм/сеанс
    const groups = new Map<GroupKey, TicketDto[]>();
    for (const t of dto.tickets) {
      const k: GroupKey = `${t.film}:${t.session}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(t);
    }

    // предварительная валидация диапазонов (rows/seats) и сбор всех ключей
    // также проверим конфликты с уже занятыми (до любых обновлений)
    for (const [key, tickets] of groups) {
      const [filmId, sessionId] = key.split(':');
      const { session } = await this.getFilmAndSessionCompat(filmId, sessionId);

      // диапазоны
      for (const t of tickets) {
        if (
          t.row < 1 ||
          t.row > session.rows ||
          t.seat < 1 ||
          t.seat > session.seats
        ) {
          throw new BadRequestException(
            `Seat out of range (row 1..${session.rows}, seat 1..${session.seats}): ${t.row}:${t.seat}`,
          );
        }
      }

      // проверка конфликтов c текущими taken
      const taken = new Set(session.taken ?? []);
      const conflicts = tickets
        .map((t) => `${t.row}:${t.seat}`)
        .filter((k) => taken.has(k));

      if (conflicts.length) {
        throw new BadRequestException(`Already taken: ${conflicts.join(', ')}`);
      }
    }

    // запись новых мест по группам
    for (const [key, tickets] of groups) {
      const [filmId, sessionId] = key.split(':');
      const seatKeys = tickets.map((t) => `${t.row}:${t.seat}`);

      const { updated, conflicts } = await this.repo.reserveSeats(
        filmId,
        sessionId,
        seatKeys,
      );
      if (!updated) {
        // кто-то мог занять между проверкой и записью
        throw new BadRequestException(
          conflicts.length
            ? `Already taken: ${conflicts.join(', ')}`
            : 'Reservation failed',
        );
      }
    }

    // формируем ответ
    const items: OrderConfirmItemDto[] = dto.tickets.map((t) => ({
      id: randomUUID(),
      film: t.film,
      session: t.session,
      daytime: t.daytime,
      row: t.row,
      seat: t.seat,
      price: t.price,
    }));

    return { total: items.length, items };
  }

  private assertTicketBasics(t: TicketDto) {
    if (!t.film || !t.session) {
      throw new BadRequestException('ticket must contain film and session ids');
    }
    if (typeof t.row !== 'number' || typeof t.seat !== 'number') {
      throw new BadRequestException('row and seat must be numbers');
    }
  }

  private async getFilmAndSessionCompat(
    filmId: string,
    sessionId: string,
  ): Promise<{ film: any; session: any }> {
    const r: any = this.repo as any;

    // Если у репозитория есть нужный метод — используем его
    if (typeof r.getFilmAndSession === 'function') {
      const res = await r.getFilmAndSession(filmId, sessionId);
      if (!res?.film) throw new NotFoundException(`Film ${filmId} not found`);
      if (!res?.session)
        throw new NotFoundException(
          `Session ${sessionId} not found for film ${filmId}`,
        );
      return res;
    }

    // Иначе — собираем вручную из доступных методов
    let scheduleRes: any;
    if (typeof r.findSchedule === 'function') {
      scheduleRes = await r.findSchedule(filmId);
    } else if (typeof r.getScheduleByFilm === 'function') {
      const items = await r.getScheduleByFilm(filmId);
      scheduleRes = { items };
    } else {
      scheduleRes = { items: [] };
    }

    const items: any[] = Array.isArray(scheduleRes)
      ? scheduleRes
      : scheduleRes?.items ?? [];
    const session = items.find((s: any) => String(s.id) === String(sessionId));
    if (!session)
      throw new NotFoundException(
        `Session ${sessionId} not found for film ${filmId}`,
      );

    let film: any = null;
    if (typeof r.findById === 'function') {
      film = await r.findById(filmId);
    } else if (typeof r.findAll === 'function') {
      const list = await r.findAll();
      const films = Array.isArray(list) ? list : list?.items ?? [];
      film = films.find((f: any) => String(f.id) === String(filmId)) ?? null;
    }
    if (!film) throw new NotFoundException(`Film ${filmId} not found`);

    return { film, session };
  }
}
