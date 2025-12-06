import { Test, TestingModule } from '@nestjs/testing';
import { FilmsController } from './films.controller';
import { FilmsService } from './films.service';
import {
  FilmIdParamDto,
  FilmsListResponseDto,
  FilmScheduleResponseDto,
} from './dto/films.dto';

describe('FilmsController', () => {
  let controller: FilmsController;

  // мок сервиса
  const filmsServiceMock = {
    list: jest.fn(),
    schedule: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilmsController],
      providers: [
        {
          provide: FilmsService,
          useValue: filmsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<FilmsController>(FilmsController);

    // очищаем счётчики вызовов перед каждым тестом
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('должен возвращать список фильмов из сервиса', async () => {
      const responseMock = {
        total: 1,
        length: 1,
        items: [
          {
            id: 'film-id',
            name: 'Test film',
          },
        ],
      } as unknown as FilmsListResponseDto;

      filmsServiceMock.list.mockResolvedValue(responseMock);

      const result = await controller.list();

      expect(filmsServiceMock.list).toHaveBeenCalledTimes(1);
      expect(result).toBe(responseMock);
    });
  });

  describe('schedule', () => {
    it('должен вызывать service.schedule с корректным id и возвращать результат', async () => {
      const params: FilmIdParamDto = { id: 'film-id' } as FilmIdParamDto;

      const scheduleMock = {
        id: 'film-id',
        schedule: [],
      } as unknown as FilmScheduleResponseDto;

      filmsServiceMock.schedule.mockResolvedValue(scheduleMock);

      const result = await controller.schedule(params);

      expect(filmsServiceMock.schedule).toHaveBeenCalledTimes(1);
      expect(filmsServiceMock.schedule).toHaveBeenCalledWith('film-id');
      expect(result).toBe(scheduleMock);
    });
  });
});
