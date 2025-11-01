import { Controller, Get, Param } from '@nestjs/common';
import {
  FilmIdParamDto,
  FilmsListResponseDto,
  FilmScheduleResponseDto,
} from './dto/films.dto';
import { FilmsService } from './films.service';

@Controller('films')
export class FilmsController {
  constructor(private readonly filmsService: FilmsService) {}

  // GET /api/afisha/films/
  @Get()
  async list(): Promise<FilmsListResponseDto> {
    return await this.filmsService.list();
  }

  // GET /api/afisha/films/:id/schedule
  @Get(':id/schedule')
  schedule(@Param() params: FilmIdParamDto): Promise<FilmScheduleResponseDto> {
    return this.filmsService.schedule(params.id);
  }
}
