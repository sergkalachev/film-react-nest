//TODO описать DTO для запросов к /films
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

// Film:id
export class FilmIdParamDto {
  @IsUUID() id!: string;
}

export class FilmScheduleLinkDto {
  @IsUUID() id!: string;
  @IsNumber() price!: number;
}

// Film
export class FilmDto {
  @IsUUID() id!: string; // example: d290f1ee-6c54-4b01-90e6-d701748f0851
  @IsNumber() @IsOptional() rating?: number; // example: 2.9
  @IsString() @IsOptional() director?: string; // example: 'Итан Райт'
  @IsArray() @IsOptional() tags?: string[]; // example: ['Документальный']
  @IsString() @IsOptional() title?: string; // example: 'Архитекторы общества'
  @IsString() @IsOptional() about?: string; // example: 'Документальный фильм, исследующий...'
  @IsString() @IsOptional() description?: string; // example: 'Документальный фильм Итана Райта исследует...'
  @IsString() @IsOptional() image?: string; // example: '/images/bg1s.jpg'
  @IsString() @IsOptional() cover?: string; // example: '/images/bg1c.jpg'
  @IsArray() @IsOptional() schedule?: FilmScheduleLinkDto[];
}

// Ответ для GET /films
export class FilmsListResponseDto {
  @IsNumber() total!: number;
  @IsArray() items!: FilmDto[];
  length: number;
}

// Shedule
export class SheduleItemDto {
  @IsUUID() id!: string; // example: 95ab4a20-9555-4a06-bfac-184b8c53fe70
  @IsString() daytime!: string; // example: '2023-05-29T10:30:00.001Z'
  @IsString() hall!: number; // example: '2'
  @IsNumber() rows!: number; // example: 5
  @IsNumber() seats!: number; // example: 10
  @IsNumber() price!: number; // example: 350
  @IsArray() @IsOptional() taken?: string[]; // example: '1:2'
}

// Ответ для GET /films/{id}/schedule:
export class FilmScheduleResponseDto {
  @IsNumber() total!: number;
  @IsArray() items!: SheduleItemDto[];
  length: number;
}
