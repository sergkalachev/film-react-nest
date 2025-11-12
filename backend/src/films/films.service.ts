import { Injectable } from '@nestjs/common';
import { FilmsListResponseDto, FilmScheduleResponseDto } from './dto/films.dto';
import { FilmsRepository } from '../repository/films.repository';

@Injectable()
export class FilmsService {
  constructor(private readonly repo: FilmsRepository) {}

  async list(): Promise<FilmsListResponseDto> {
    const raw: any = await this.repo.findAll();
    const items = Array.isArray(raw) ? raw : raw?.items ?? [];
    const total = Array.isArray(raw)
      ? items.length
      : raw?.total ?? items.length;
    return { total, items, length: items.length } as any;
  }

  async schedule(filmId: string): Promise<FilmScheduleResponseDto> {
    const raw: any = await this.repo.findSchedule(filmId);
    const items = Array.isArray(raw) ? raw : raw?.items ?? [];
    const total = Array.isArray(raw)
      ? items.length
      : raw?.total ?? items.length;
    return { total, items, length: items.length } as any;
  }
}
