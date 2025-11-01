import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FilmDocument, FilmEntity } from './films.schema';
import {
  FilmsListResponseDto,
  FilmScheduleResponseDto,
  FilmDto,
  SheduleItemDto,
} from '../films/dto/films.dto';

@Injectable()
export class FilmsRepository {
  constructor(
    @InjectModel(FilmEntity.name)
    private readonly filmModel: Model<FilmDocument>,
  ) {}

  async findAll(): Promise<FilmsListResponseDto> {
    const docs = await this.filmModel.find({}, { _id: 0 }).lean();
    const items: FilmDto[] = docs.map((d) => ({
      id: d.id,
      rating: d.rating,
      director: d.director,
      tags: d.tags ?? [],
      title: d.title,
      about: d.about,
      description: d.description,
      image: d.image,
      cover: d.cover,
    }));
    return { total: items.length, items };
  }

  async findSchedule(filmId: string): Promise<FilmScheduleResponseDto> {
    const doc = await this.filmModel
      .findOne({ id: filmId }, { _id: 0, schedule: 1 })
      .lean();
    const items: SheduleItemDto[] = (doc?.schedule ?? []).map((s) => ({
      id: s.id,
      daytime: s.daytime,
      hall: s.hall,
      rows: s.rows,
      seats: s.seats,
      price: s.price,
      taken: s.taken ?? [],
    }));
    return { total: items.length, items };
  }
  /** Получить фильм и конкретный сеанс (кинозал) */
  async getFilmAndSession(filmId: string, sessionId: string) {
    const film = await this.filmModel.findOne({ id: filmId }).lean();
    if (!film) throw new NotFoundException(`Film ${filmId} not found`);
    const session = film.schedule?.find((s) => s.id === sessionId);
    if (!session)
      throw new NotFoundException(
        `Session ${sessionId} not found for film ${filmId}`,
      );
    return { film, session };
  }

  /**
   * Зарезервировать места атомарно:
   * - сначала проверяем конфликты,
   * - затем добавляем новыеtaken через $addToSet $each.
   */
  async reserveSeats(filmId: string, sessionId: string, seatKeys: string[]) {
    // 1) повторная защита: если уже занято — сообщим
    const doc = await this.filmModel
      .findOne(
        { id: filmId, 'schedule.id': sessionId },
        { _id: 0, 'schedule.$': 1 },
      )
      .lean();

    if (!doc || !doc.schedule?.length) {
      throw new NotFoundException(
        `Session ${sessionId} not found for film ${filmId}`,
      );
    }

    const taken: string[] = doc.schedule[0].taken ?? [];
    const conflicts = seatKeys.filter((k) => taken.includes(k));
    if (conflicts.length) {
      return { updated: false, conflicts };
    }

    // 2) добавляем
    const res = await this.filmModel.updateOne(
      { id: filmId, 'schedule.id': sessionId },
      { $addToSet: { 'schedule.$.taken': { $each: seatKeys } } },
    );

    return { updated: res.modifiedCount > 0, conflicts: [] };
  }
}
