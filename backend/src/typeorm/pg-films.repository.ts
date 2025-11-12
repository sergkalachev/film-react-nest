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

  private mapRawFilm(row: any) {
    return {
      id: String(row.f_id),
      title: row.title ?? undefined,
      description: row.f_description ?? undefined,
      image: row.f_image ?? undefined,
      cover: row.f_cover ?? undefined,
    };
  }

  async findAll(): Promise<any[]> {
    const rows = await this.getFilms();
    return rows as any[];
  }

  async findById(id: string): Promise<any | null> {
    return (await this.getFilmById(id)) as any;
  }

  async findSchedule(filmId: string): Promise<any[]> {
    return this.getSchedulesByFilm(filmId);
  }

  async getScheduleByFilm(filmId: string): Promise<any[]> {
    return (await this.getSchedulesByFilm(filmId)) as any[];
  }

  // Методы работы с БД
  async getFilms(): Promise<any[]> {
    const rows = await this.films
      .createQueryBuilder('f')
      .select('f.id', 'f_id')
      .addSelect('f.description', 'f_description')
      .addSelect('f.image', 'f_image')
      .addSelect('f.cover', 'f_cover')
      .addSelect('f.title', 'title')
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
      .where('f.id = :id', { id: pk })
      .getRawOne();

    return row ? this.mapRawFilm(row) : null;
  }

  async getSchedulesByFilm(filmId: string): Promise<Schedule[]> {
    return this.schedules.find({
      where: { filmId } as any,
    });
  }

  async reserveSeats(
    filmId: string,
    sessionId: string,
    seatKeys: string[],
  ): Promise<{ updated: boolean; conflicts: string[] }> {
    // найти расписание по фильму и сеансу
    const schedule = await this.schedules.findOne({
      where: { id: sessionId as any, filmId: filmId as any } as any,
    });
    if (!schedule) {
      return { updated: false, conflicts: seatKeys.slice() };
    }

    const currentTaken: string[] =
      (schedule as any).taken ?? (schedule as any).takenSeats ?? [];

    // определить конфликты
    const conflicts = seatKeys.filter((k) => currentTaken.includes(k));
    if (conflicts.length > 0) {
      return { updated: false, conflicts };
    }

    const newTaken = Array.from(new Set([...currentTaken, ...seatKeys]));

    // подготовить payload под фактическое имя поля в entity/таблице
    const payload: Partial<Schedule> = {} as any;
    if ('taken' in schedule) {
      (payload as any).taken = newTaken;
    } else {
      (payload as any).takenSeats = newTaken;
    }

    await this.schedules.update(
      { id: sessionId as any } as any,
      payload as any,
    );

    return { updated: true, conflicts: [] };
  }
}
