import { Inject, Injectable } from '@nestjs/common';
import {
  CreateOrderDto,
  OrderConfirmItemDto,
  OrderConfirmResponseDto,
  TicketDto,
} from './dto/order.dto';
import { randomUUID } from 'crypto';

interface FilmLite {
  id: string;
}
interface SessionLite {
  id: string;
  filmId?: string;
  rows?: number;
  seats?: number;
  price?: number;
  taken?: string[];
  takenSeats?: string[];
}

/** Варианты ответов для списков */
type FilmListLike =
  | FilmLite[]
  | { items: FilmLite[]; total?: number; length?: number };

type ScheduleListLike =
  | SessionLite[]
  | { items: SessionLite[]; total?: number; length?: number };

interface FilmsRepo {
  getFilmAndSession?: (
    filmId: string,
    sessionId: string,
  ) => Promise<{ film: FilmLite | null; session: SessionLite | null }>;

  findSchedule?: (filmId: string) => Promise<ScheduleListLike>;
  getScheduleByFilm?: (filmId: string) => Promise<SessionLite[]>;

  findById?: (filmId: string) => Promise<FilmLite | null>;
  findAll?: () => Promise<FilmListLike>;

  reserveSeats?: (
    filmId: string,
    sessionId: string,
    seats: string[],
  ) => Promise<{ updated: boolean; conflicts: string[] }>;
}

type GroupKey = `${string}:${string}`;

@Injectable()
export class OrderService {
  constructor(@Inject('FILMS_REPOSITORY') private readonly repo: FilmsRepo) {}

  private seatKey(row: number, seat: number) {
    return `${row}:${seat}`;
  }

  private async safeGetFilmAndSession(
    filmId: string,
    sessionId: string,
  ): Promise<{ film: FilmLite | null; session: SessionLite | null }> {
    if (typeof this.repo.getFilmAndSession === 'function') {
      const res = await this.repo.getFilmAndSession(filmId, sessionId);
      return { film: res.film ?? null, session: res.session ?? null };
    }

    // расписание
    let schedule: SessionLite[] = [];
    if (typeof this.repo.findSchedule === 'function') {
      const r = await this.repo.findSchedule(filmId);
      schedule = Array.isArray(r) ? r : r.items ?? [];
    } else if (typeof this.repo.getScheduleByFilm === 'function') {
      schedule = await this.repo.getScheduleByFilm(filmId);
    }
    const session =
      schedule.find((s) => String(s.id) === String(sessionId)) ?? null;

    // фильм
    let film: FilmLite | null = null;
    if (typeof this.repo.findById === 'function') {
      film = (await this.repo.findById(filmId)) ?? null;
    } else if (typeof this.repo.findAll === 'function') {
      const list = await this.repo.findAll();
      const films = Array.isArray(list) ? list : list.items ?? [];
      film = films.find((f) => String(f.id) === String(filmId)) ?? null;
    }

    return { film, session };
  }

  async createOrder(dto: CreateOrderDto): Promise<OrderConfirmResponseDto> {
    const items: OrderConfirmItemDto[] = [];
    const tickets = Array.isArray(dto.tickets) ? dto.tickets : [];

    const groups = new Map<GroupKey, TicketDto[]>();
    const seen = new Set<string>();
    for (const t of tickets) {
      if (!t?.film || !t?.session) continue;
      const dupKey = `${t.film}|${t.session}|${t.row}:${t.seat}`;
      if (seen.has(dupKey)) continue;
      seen.add(dupKey);

      const gk: GroupKey = `${t.film}:${t.session}`;
      const arr = groups.get(gk);
      if (arr) arr.push(t);
      else groups.set(gk, [t]);
    }

    for (const [gk, group] of groups) {
      const [filmId, sessionId] = gk.split(':');

      const { film, session } = await this.safeGetFilmAndSession(
        filmId,
        sessionId,
      );
      if (!film || !session) {
        continue;
      }

      if (typeof this.repo.reserveSeats === 'function') {
        const seatKeys = group.map((t) => this.seatKey(t.row, t.seat));
        try {
          await this.repo.reserveSeats(filmId, sessionId, seatKeys);
        } catch {
          // ignore
        }
      }

      for (const t of group) {
        const normalizedDaytime = (t.daytime ?? '').trim() || 'null';

        items.push({
          id: randomUUID(),
          film: t.film,
          session: t.session,
          daytime: normalizedDaytime,
          row: t.row,
          seat: t.seat,
          price: t.price,
        });
      }
    }

    return { total: items.length, items };
  }
}
