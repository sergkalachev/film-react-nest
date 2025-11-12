import { Injectable } from '@nestjs/common';
import { FilmsListResponseDto, FilmScheduleResponseDto } from './dto/films.dto';
import { FilmsRepository } from '../repository/films.repository';

@Injectable()
export class FilmsService {
  constructor(private readonly repo: FilmsRepository) {}

  list(): Promise<FilmsListResponseDto> {
    return this.repo.findAll();
  }

  schedule(filmId: string): Promise<FilmScheduleResponseDto> {
    return this.repo.findSchedule(filmId);
  }
}
