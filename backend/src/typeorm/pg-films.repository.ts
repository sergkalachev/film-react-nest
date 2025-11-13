import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Film } from '../entities/film.entity';
import { Schedule } from '../entities/schedule.entity';
import { Injectable } from '@nestjs/common';
import { FilmDto, SheduleItemDto } from '../films/dto/films.dto';

interface RawFilmRow {
  f_id: string | number;
  f_description: string | null;
  f_image: string | null;
  f_cover: string | null;
  title: string | null;
  f_director: string | null;
  f_rating: number | null;
  f_tags: string | string[] | null;
  f_about: string | null;
}

interface RawFirstScheduleRow {
  filmId: string;
  id: string;
  price: number | null;
  daytime: string | Date;
}

interface RawScheduleRow {
  id: string;
  film_id: string;
  daytime: string | Date;
  hall: number | string;
  rows: number | string | null;
  seats: number | string | null;
  price: number | string | null;
  taken: string | string[] | null;
}

interface ConflictRow {
  conflicts: string[];
}
interface UpdatedTakenRow {
  taken: string[] | null;
}
interface UpdatedTakenSeatsRow {
  takenSeats: string[] | null;
}

type SchedulePreview = { id: string; price: number };

@Injectable()
export class PgFilmsRepository {
  constructor(
    @InjectRepository(Film) private readonly films: Repository<Film>,
    @InjectRepository(Schedule)
    private readonly schedules: Repository<Schedule>,
  ) {}

  private toStringArray(raw: string[] | string | null | undefined): string[] {
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

  private mapRawFilm(row: RawFilmRow): FilmDto {
    const tagSrc = row.f_tags;
    let tags: string[] = [];
    if (Array.isArray(tagSrc)) tags = tagSrc.map(String);
    else if (typeof tagSrc === 'string' && tagSrc.trim()) {
      try {
        const parsed = JSON.parse(tagSrc);
        if (Array.isArray(parsed)) tags = parsed.map(String);
      } catch {
        /* noop */
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
    };
  }

  async findAll(): Promise<(FilmDto & { schedule: SchedulePreview[] })[]> {
    const films = await this.getFilms();
    const filmIds = films.map((f) => f.id);
    if (filmIds.length === 0) {
      return films.map((f) => ({ ...f, schedule: [] }));
    }

    const first = await this.schedules.query<RawFirstScheduleRow[]>(
      `
      SELECT DISTINCT ON ("filmId")
             "filmId", "id", "price", "daytime"
        FROM "schedules"
       WHERE "filmId" = ANY($1)
       ORDER BY "filmId", "daytime" ASC
      `,
      [filmIds],
    );

    const map = new Map<string, SchedulePreview>();
    for (const r of first) {
      map.set(String(r.filmId), {
        id: String(r.id),
        price: r.price != null ? Number(r.price) : 350,
      });
    }

    return films.map((f) => ({
      ...f,
      schedule: map.has(f.id) ? [map.get(f.id)!] : [],
    }));
  }

  async findById(id: string): Promise<FilmDto | null> {
    return this.getFilmById(id);
  }

  async findSchedule(filmId: string): Promise<
    (FilmDto & { schedule?: SchedulePreview[] }) & {
      items: SheduleItemDto[];
      total: number;
      length: number;
    }
  > {
    const film = await this.getFilmById(filmId);
    const items = await this.getSchedulesByFilm(filmId);
    const preview: SchedulePreview[] =
      items.length > 0
        ? [{ id: items[0].id, price: items[0].price ?? 350 }]
        : [];

    const base = film ?? ({ id: filmId } as FilmDto);
    return {
      ...base,
      schedule: preview,
      items,
      total: items.length,
      length: items.length,
    };
  }

  async schedule(filmId: string) {
    return this.findSchedule(filmId);
  }

  async getFilmAndSession(
    filmId: string,
    sessionId?: string,
  ): Promise<{ film: FilmDto | null; session: SheduleItemDto | null }> {
    const film = await this.getFilmById(filmId);
    if (!film) return { film: null, session: null };
    if (!sessionId) return { film, session: null };
    const items = await this.getSchedulesByFilm(filmId);
    return { film, session: items.find((i) => i.id === sessionId) ?? null };
  }

  async getFilms(): Promise<FilmDto[]> {
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
      .getRawMany<RawFilmRow>();

    return rows.map((r) => this.mapRawFilm(r));
  }

  async getFilmById(id: string): Promise<FilmDto | null> {
    const pk: string | number = /^\d+$/.test(id) ? Number(id) : id;
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
      .getRawOne<RawFilmRow>();

    return row ? this.mapRawFilm(row) : null;
  }

  async getSchedulesByFilm(filmId: string): Promise<SheduleItemDto[]> {
    const rows = await this.schedules.query<RawScheduleRow[]>(
      `
      SELECT "id",
             "filmId" AS film_id,
             "daytime",
             "hall",
             "rows",
             "seats",
             "price",
             "taken"
        FROM "schedules"
       WHERE "filmId" = $1
       ORDER BY "daytime" ASC
      `,
      [filmId],
    );

    return rows.map((r): SheduleItemDto => {
      const taken = this.toStringArray(r.taken);
      const dt = r.daytime instanceof Date ? r.daytime : new Date(r.daytime);
      return {
        id: String(r.id),
        daytime: dt.toISOString(),
        hall: typeof r.hall === 'number' ? r.hall : Number(r.hall),
        rows: r.rows != null ? Number(r.rows) : 0,
        seats: r.seats != null ? Number(r.seats) : 0,
        price: r.price != null ? Number(r.price) : 0,
        taken,
      };
    });
  }

  async reserveSeats(
    filmId: string,
    sessionId: string,
    seatKeys: string[],
  ): Promise<{ updated: boolean; conflicts: string[] }> {
    const unique = Array.from(new Set(seatKeys));

    try {
      const updated = await this.schedules.query<UpdatedTakenRow[]>(
        `
        UPDATE "schedules"
           SET "taken" = (
             SELECT ARRAY(
               SELECT DISTINCT e
               FROM unnest(COALESCE("taken", '{}'::text[]) || $3::text[]) AS e
             )
           )
         WHERE "id" = $1
           AND "filmId" = $2
           AND NOT EXISTS (
             SELECT 1
             FROM unnest(COALESCE("taken", '{}'::text[])) AS t
             WHERE t = ANY ($3::text[])
           )
        RETURNING "taken";
        `,
        [sessionId, filmId, unique],
      );

      if (updated.length > 0) return { updated: true, conflicts: [] };

      const rows = await this.schedules.query<ConflictRow[]>(
        `
        SELECT ARRAY(
                 SELECT t
                 FROM unnest(COALESCE("taken", '{}'::text[])) AS t
                 WHERE t = ANY ($3::text[])
               ) AS conflicts
          FROM "schedules"
         WHERE "id" = $1 AND "filmId" = $2
        `,
        [sessionId, filmId, unique],
      );

      if (rows.length === 0) return { updated: false, conflicts: unique };
      const conflicts = rows[0].conflicts ?? [];
      if (conflicts.length > 0) return { updated: false, conflicts };
    } catch {
      /* попробуем takenSeats */
    }

    try {
      const updated2 = await this.schedules.query<UpdatedTakenSeatsRow[]>(
        `
        UPDATE "schedules"
           SET "takenSeats" = (
             SELECT ARRAY(
               SELECT DISTINCT e
               FROM unnest(COALESCE("takenSeats", '{}'::text[]) || $3::text[]) AS e
             )
           )
         WHERE "id" = $1
           AND "filmId" = $2
           AND NOT EXISTS (
             SELECT 1
             FROM unnest(COALESCE("takenSeats", '{}'::text[])) AS t
             WHERE t = ANY ($3::text[])
           )
        RETURNING "takenSeats";
        `,
        [sessionId, filmId, unique],
      );

      if (updated2.length > 0) return { updated: true, conflicts: [] };

      const rows2 = await this.schedules.query<ConflictRow[]>(
        `
        SELECT ARRAY(
                 SELECT t
                 FROM unnest(COALESCE("takenSeats", '{}'::text[])) AS t
                 WHERE t = ANY ($3::text[])
               ) AS conflicts
          FROM "schedules"
         WHERE "id" = $1 AND "filmId" = $2
        `,
        [sessionId, filmId, unique],
      );

      if (rows2.length === 0) return { updated: false, conflicts: unique };
      const conflicts2 = rows2[0].conflicts ?? [];
      return conflicts2.length > 0
        ? { updated: false, conflicts: conflicts2 }
        : { updated: false, conflicts: [] };
    } catch {
      return { updated: false, conflicts: unique };
    }
  }
}
