import { Test, TestingModule } from '@nestjs/testing';
import { FilmsService } from './films.service';
import { FilmsRepository } from '../repository/films.repository';
import {
  FilmDto,
  FilmsListResponseDto,
  FilmScheduleResponseDto,
  SheduleItemDto,
} from './dto/films.dto';

describe('FilmsService', () => {
  let service: FilmsService;

  const repoMock = {
    findAll: jest.fn(),
    findSchedule: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilmsService,
        {
          provide: FilmsRepository,
          useValue: repoMock,
        },
      ],
    }).compile();

    service = module.get<FilmsService>(FilmsService);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('должен нормализовать список фильмов, если репозиторий вернул массив', async () => {
      const films: FilmDto[] = [
        { id: '1', name: 'Film 1' } as FilmDto,
        { id: '2', name: 'Film 2' } as FilmDto,
      ];

      repoMock.findAll.mockResolvedValue(films);

      const result = (await service.list()) as FilmsListResponseDto;

      expect(repoMock.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        total: 2,
        items: films,
        length: 2,
      });
    });

    it('должен использовать total из объекта, если репозиторий вернул { items, total }', async () => {
      const films: FilmDto[] = [
        { id: '1', name: 'Film 1' } as FilmDto,
        { id: '2', name: 'Film 2' } as FilmDto,
      ];

      const raw = {
        items: films,
        total: 10,
      };

      repoMock.findAll.mockResolvedValue(raw);

      const result = (await service.list()) as FilmsListResponseDto;

      expect(result.total).toBe(10); // берётся из raw.total
      expect(result.items).toBe(films);
      expect(result.length).toBe(2);
    });
  });

  describe('schedule', () => {
    it('должен нормализовать расписание, если репозиторий вернул массив', async () => {
      const filmId = 'film-1';

      const schedule: SheduleItemDto[] = [
        { id: 's1', daytime: '2025-12-05T10:00:00Z' } as SheduleItemDto,
        { id: 's2', daytime: '2025-12-05T12:00:00Z' } as SheduleItemDto,
      ];

      repoMock.findSchedule.mockResolvedValue(schedule);

      const result = (await service.schedule(
        filmId,
      )) as FilmScheduleResponseDto;

      expect(repoMock.findSchedule).toHaveBeenCalledTimes(1);
      expect(repoMock.findSchedule).toHaveBeenCalledWith(filmId);

      expect(result).toEqual({
        total: 2,
        items: schedule,
        length: 2,
      });
    });

    it('должен сливать дополнительные поля из объекта и нормализованный список', async () => {
      const filmId = 'film-1';

      const schedule: SheduleItemDto[] = [
        { id: 's1', daytime: '2025-12-05T10:00:00Z' } as SheduleItemDto,
        { id: 's2', daytime: '2025-12-05T12:00:00Z' } as SheduleItemDto,
      ];

      const raw = {
        filmId,
        filmName: 'Test film',
        items: schedule,
        total: 5,
      };

      repoMock.findSchedule.mockResolvedValue(raw);

      const result = (await service.schedule(
        filmId,
      )) as FilmScheduleResponseDto;

      // normalizeList
      expect(result.total).toBe(5);
      expect(result.items).toBe(schedule);
      expect(result.length).toBe(2);

      // поля из base-объекта должны сохраниться
      expect((result as any).filmId).toBe(filmId);
      expect((result as any).filmName).toBe('Test film');
    });
  });
});
