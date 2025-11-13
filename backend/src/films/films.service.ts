import { Injectable } from '@nestjs/common';
import {
  FilmDto,
  FilmsListResponseDto,
  FilmScheduleResponseDto,
  SheduleItemDto,
} from './dto/films.dto';
import { FilmsRepository } from '../repository/films.repository';

function normalizeList<T>(raw: T[] | { items: T[]; total?: number }): {
  total: number;
  items: T[];
  length: number;
} {
  const items = Array.isArray(raw) ? raw : raw.items;
  const total = Array.isArray(raw) ? items.length : raw.total ?? items.length;
  return { total, items, length: items.length };
}
function isObjectWithItems<T>(
  v: unknown,
): v is { items: T[]; total?: number; [k: string]: unknown } {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as { items?: unknown };
  return Array.isArray(o.items);
}

@Injectable()
export class FilmsService {
  constructor(private readonly repo: FilmsRepository) {}

  /** GET /films */
  async list(): Promise<FilmsListResponseDto> {
    const raw = (await this.repo.findAll()) as
      | FilmDto[]
      | { items: FilmDto[]; total?: number };
    return normalizeList<FilmDto>(raw);
  }

  /** GET /films/:id/schedule */
  async schedule(filmId: string): Promise<FilmScheduleResponseDto> {
    const raw = (await this.repo.findSchedule(filmId)) as unknown as
      | SheduleItemDto[]
      | ({ items: SheduleItemDto[]; total?: number } & Record<string, unknown>);

    const base = isObjectWithItems<SheduleItemDto>(raw) ? raw : undefined;
    const normalized = normalizeList<SheduleItemDto>(
      base
        ? { items: base.items, total: base.total }
        : (raw as SheduleItemDto[]),
    );

    return {
      ...(base ?? {}),
      ...normalized,
    } as unknown as FilmScheduleResponseDto;
  }
}
