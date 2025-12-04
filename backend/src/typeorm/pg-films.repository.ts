import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Film } from '../entities/film.entity';
import { Schedule } from '../entities/schedule.entity';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { FilmDto, SheduleItemDto } from '../films/dto/films.dto';

interface RawFilmRow {
  f_id: string | number;
  title?: string | null;
  f_description?: string | null;
  f_image?: string | null;
  f_cover?: string | null;
  f_director?: string | null;
  f_rating?: number | null;
  f_tags?: string | string[] | null;
  f_about?: string | null;
}

interface RawFirstScheduleRow {
  filmId: string;
  id: string;
  price: number | null;
  daytime: string | Date;
}

interface RawScheduleRow {
  id: string;
  film_id?: string;
  daytime?: string | Date;
  hall?: number | string;
  rows?: number | string | null;
  seats?: number | string | null;
  price?: number | string | null;
  taken?: string | string[] | null;
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
export class PgFilmsRepository implements OnModuleInit {
  constructor(
    @InjectRepository(Film) private readonly films: Repository<Film>,
    @InjectRepository(Schedule)
    private readonly schedules: Repository<Schedule>,
  ) {}

  /** Наборы реально существующих колонок в БД (заполняются при старте) */
  private filmCols = new Set<string>();
  private schedCols = new Set<string>();

  async onModuleInit(): Promise<void> {
    // Снимем "инвентаризацию" колонок в public.films и public.schedules
    const filmRows = await this.films.query<{ column_name: string }[]>(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'films'
      `,
    );
    this.filmCols = new Set(filmRows.map((r) => r.column_name));

    const schedRows = await this.schedules.query<{ column_name: string }[]>(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'schedules'
      `,
    );
    this.schedCols = new Set(schedRows.map((r) => r.column_name));
  }

  // ---------- helpers ----------

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

  /** Добавляем в qb только те колонки фильмов, что реально есть в БД */
  private applyFilmColumns(qb: SelectQueryBuilder<Film>) {
    qb.select('f.id', 'f_id');

    if (this.filmCols.has('title')) qb.addSelect('f.title', 'title');
    if (this.filmCols.has('description'))
      qb.addSelect('f.description', 'f_description');
    if (this.filmCols.has('image')) qb.addSelect('f.image', 'f_image');
    if (this.filmCols.has('cover')) qb.addSelect('f.cover', 'f_cover');
    if (this.filmCols.has('director')) qb.addSelect('f.director', 'f_director');
    if (this.filmCols.has('rating')) qb.addSelect('f.rating', 'f_rating');
    if (this.filmCols.has('tags')) qb.addSelect('f.tags', 'f_tags');
    if (this.filmCols.has('about')) qb.addSelect('f.about', 'f_about');

    return qb;
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
      director: typeof row.f_director === 'string' ? row.f_director : '',
      rating:
        typeof row.f_rating === 'number'
          ? row.f_rating
          : row.f_rating != null
            ? Number(row.f_rating)
            : 0,
      tags,
      about: row.f_about ?? '',
    };
  }

  // ---------- public API (контракт с сервисами) ----------

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

  // ---------- low-level ----------

  async getFilms(): Promise<FilmDto[]> {
    const rows = await this.applyFilmColumns(this.films.createQueryBuilder('f'))
      .orderBy('f.id', 'ASC')
      .getRawMany<RawFilmRow>();

    return rows.map((r) => this.mapRawFilm(r));
  }

  async getFilmById(id: string): Promise<FilmDto | null> {
    const pk: string | number = /^\d+$/.test(id) ? Number(id) : id;
    const row = await this.applyFilmColumns(this.films.createQueryBuilder('f'))
      .where('f.id = :id', { id: pk })
      .getRawOne<RawFilmRow>();

    return row ? this.mapRawFilm(row) : null;
  }

  async getSchedulesByFilm(filmId: string): Promise<SheduleItemDto[]> {
    // Составим SELECT динамически — берём только существующие колонки
    const selectParts: string[] = ['"id"', '"filmId" AS film_id'];

    // daytime предпочтителен, но на всякий
    if (this.schedCols.has('daytime')) selectParts.push('"daytime"');
    if (this.schedCols.has('hall')) selectParts.push('"hall"');
    if (this.schedCols.has('rows')) selectParts.push('"rows"');
    if (this.schedCols.has('seats')) selectParts.push('"seats"');
    if (this.schedCols.has('price')) selectParts.push('"price"');

    // Чтобы маппер был единообразным, если нет taken, но есть takenSeats — алиасим в taken
    if (this.schedCols.has('taken')) {
      selectParts.push('"taken"');
    } else if (this.schedCols.has('takenSeats')) {
      selectParts.push('"takenSeats" AS taken');
    }

    const orderBy = this.schedCols.has('daytime')
      ? '"daytime" ASC'
      : '"id" ASC';

    const sql = `
      SELECT ${selectParts.join(',\n             ')}
        FROM "schedules"
       WHERE "filmId" = $1
       ORDER BY ${orderBy}
    `;

    const rows = await this.schedules.query<RawScheduleRow[]>(sql, [filmId]);

    return rows.map((r): SheduleItemDto => {
      const taken = this.toStringArray(r.taken ?? null);
      const dtRaw = r.daytime;
      const dt =
        typeof dtRaw === 'string'
          ? new Date(dtRaw)
          : dtRaw instanceof Date
            ? dtRaw
            : new Date(0); // безопасный дефолт

      const hall =
        typeof r.hall === 'number'
          ? r.hall
          : r.hall != null
            ? Number(r.hall)
            : 0;
      const rowsN = r.rows != null ? Number(r.rows) : 0;
      const seatsN = r.seats != null ? Number(r.seats) : 0;
      const priceN = r.price != null ? Number(r.price) : 0;

      return {
        id: String(r.id),
        daytime: dt.toISOString(),
        hall,
        rows: rowsN,
        seats: seatsN,
        price: priceN,
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
    const canTaken = this.schedCols.has('taken');
    const canTakenSeats = this.schedCols.has('takenSeats');

    // 1) Вариант с колонкой taken
    if (canTaken) {
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
    }

    // 2) Фоллбек — колонка takenSeats
    if (canTakenSeats) {
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
      if (conflicts2.length > 0)
        return { updated: false, conflicts: conflicts2 };
    }

    // 3) Колонок для бронирования нет — ничего не меняем
    return { updated: false, conflicts: unique };
  }
}
