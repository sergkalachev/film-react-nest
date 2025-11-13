import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Film } from '../entities/film.entity';
import { Schedule } from '../entities/schedule.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PgFilmsRepository {
  constructor(
    @InjectRepository(Film) private readonly films: Repository<Film>,
    @InjectRepository(Schedule)
    private readonly schedules: Repository<Schedule>,
  ) {}

  // Нормализация столбца занятых мест из разных представлений (text[], text(JSON))
  private toStringArray(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private mapRawFilm(row: any) {
    let tags: string[] = [];
    const rawTags = row.f_tags;
    if (Array.isArray(rawTags)) {
      tags = rawTags;
    } else if (typeof rawTags === 'string' && rawTags.trim()) {
      try {
        const parsed = JSON.parse(rawTags);
        if (Array.isArray(parsed)) tags = parsed;
      } catch {
        tags = [];
      }
    }

    return {
      id: String(row.f_id),
      title: row.title ?? undefined,
      description: row.f_description ?? undefined,
      image: row.f_image ?? undefined,
      cover: row.f_cover ?? undefined,
      director: row.f_director ?? '',
      rating: row.f_rating != null ? Number(row.f_rating) : 0,
      tags,
      about: row.f_about ?? '',
      schedule: [{ id: String(row.f_id) }],
    };
  }

  private buildFilmScheduleResponse(film: any, items: any[]) {
    return {
      ...film,
      items,
      total: items.length,
      length: items.length,
    };
  }

  async findAll(): Promise<any[]> {
    const rows = await this.getFilms();
    return rows as any[];
  }

  async findById(id: string): Promise<any | null> {
    return (await this.getFilmById(id)) as any;
  }

  async findSchedule(filmId: string) {
    const film = await this.getFilmById(filmId);
    if (!film) {
      return this.buildFilmScheduleResponse({ id: filmId }, []);
    }
    const items = await this.getSchedulesByFilm(filmId);
    return this.buildFilmScheduleResponse(film, items);
  }

  async schedule(filmId: string) {
    return this.findSchedule(filmId);
  }

  async getFilmAndSession(filmId: string, sessionId?: string) {
    const film = await this.getFilmById(filmId);
    if (!film) {
      return { film: null, session: null };
    }

    const items = await this.getSchedulesByFilm(filmId);

    if (!sessionId) {
      return { film, session: null };
    }

    const one =
      items.find((i: any) => String(i.id) === String(sessionId)) ?? null;
    return { film, session: one };
  }

  // ----- Методы работы с БД -----
  async getFilms(): Promise<any[]> {
    const rows = await this.films
      .createQueryBuilder('f')
      .select('f.id', 'f_id')
      .addSelect('f.description', 'f_description')
      .addSelect('f.image', 'f_image')
      .addSelect('f.cover', 'f_cover')
      .addSelect('f.title', 'title')
      .addSelect('f.director', 'f_director')
      .addSelect('f.rating', 'f_rating')
      .addSelect('f.tags', 'f_tags')
      .addSelect('f.about', 'f_about')
      .orderBy('f.id', 'ASC')
      .getRawMany();

    return rows.map((r) => this.mapRawFilm(r));
  }

  async getFilmById(id: string): Promise<any | null> {
    const pk: any = /^\d+$/.test(id) ? Number(id) : id;

    const row = await this.films
      .createQueryBuilder('f')
      .select('f.id', 'f_id')
      .addSelect('f.description', 'f_description')
      .addSelect('f.image', 'f_image')
      .addSelect('f.cover', 'f_cover')
      .addSelect('f.title', 'title')
      .addSelect('f.director', 'f_director')
      .addSelect('f.rating', 'f_rating')
      .addSelect('f.tags', 'f_tags')
      .addSelect('f.about', 'f_about')
      .where('f.id = :id', { id: pk })
      .getRawOne();

    return row ? this.mapRawFilm(row) : null;
  }

  async getSchedulesByFilm(filmId: string): Promise<Schedule[]> {
    const rows = await this.schedules.query(
      `SELECT "id",
              "filmId" AS film_id,
              "daytime",
              "hall",
              "rows",
              "seats",
              "price",
              "taken"
         FROM "schedules"
        WHERE "filmId" = $1
        ORDER BY "daytime" ASC`,
      [filmId],
    );

    return rows.map((r: any) => {
      const taken = this.toStringArray(r.taken);
      return {
        id: String(r.id),
        filmId: String(r.film_id),
        daytime: r.daytime instanceof Date ? r.daytime : new Date(r.daytime),
        hall: typeof r.hall === 'number' ? r.hall : Number(r.hall),
        rows: r.rows != null ? Number(r.rows) : undefined,
        seats: r.seats != null ? Number(r.seats) : undefined,
        price: r.price != null ? Number(r.price) : undefined,
        taken,
        takenSeats: taken,
      } as any;
    });
  }

  async reserveSeats(
    filmId: string,
    sessionId: string,
    seatKeys: string[],
  ): Promise<{ updated: boolean; conflicts: string[] }> {
    const unique = Array.from(new Set(seatKeys));

    // 1) Пытаемся атомарно обновить текстовый массив taken (тип text[])
    //    Если есть пересечение с unique — UPDATE не выполнится.
    try {
      // Попытка обновления без конфликтов
      const updated = await this.schedules.query(
        `
        UPDATE "schedules"
           SET "taken" = (
             SELECT ARRAY(
               SELECT DISTINCT e
               FROM unnest("taken" || $3::text[]) AS e
             )
           )
         WHERE "id" = $1
           AND "filmId" = $2
           AND NOT EXISTS (
             SELECT 1
             FROM unnest("taken") AS t
             WHERE t = ANY ($3::text[])
           )
        RETURNING "taken";
        `,
        [sessionId, filmId, unique],
      );

      if (Array.isArray(updated) && updated.length > 0) {
        // Успешно зарезервировали
        return { updated: true, conflicts: [] };
      }

      // Обновление не прошло — либо конфликты, либо нет такого сеанса
      const rows = await this.schedules.query(
        `
        SELECT ARRAY(
                 SELECT t
                 FROM unnest("taken") AS t
                 WHERE t = ANY ($3::text[])
               ) AS conflicts
          FROM "schedules"
         WHERE "id" = $1 AND "filmId" = $2
        `,
        [sessionId, filmId, unique],
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        // сеанс не найден
        return { updated: false, conflicts: unique };
      }

      const conflicts: string[] = rows[0]?.conflicts ?? [];
      return { updated: false, conflicts };
    } catch {
      // 2) Фоллбек на «неатомарную» логику (на случай, если колонка taken вдруг не text[])
      const schedule = await this.schedules.findOne({
        where: { id: sessionId as any, filmId: filmId as any } as any,
      });
      if (!schedule) {
        return { updated: false, conflicts: unique.slice() };
      }

      const currentTaken: string[] =
        (schedule as any).taken ?? (schedule as any).takenSeats ?? [];

      const conflicts = unique.filter((k) => currentTaken.includes(k));
      if (conflicts.length) {
        return { updated: false, conflicts };
      }

      const newTaken = Array.from(new Set([...currentTaken, ...unique]));
      const payload: Partial<Schedule> = {} as any;
      if ('taken' in schedule) (payload as any).taken = newTaken;
      else (payload as any).takenSeats = newTaken;

      await this.schedules.update(
        { id: sessionId as any } as any,
        payload as any,
      );

      return { updated: true, conflicts: [] };
    }
  }
}
