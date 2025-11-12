import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Film } from './film.entity';

@Entity({ name: 'schedules' })
export class Schedule {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Index()
  @Column({ type: 'uuid', name: 'filmId' })
  filmId!: string;

  @ManyToOne(() => Film, (film) => film.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'filmId', referencedColumnName: 'id' })
  film!: Film;

  @Column({ type: 'timestamptz', name: 'daytime' })
  daytime!: Date;

  @Column({ type: 'varchar', length: 10, name: 'hall' })
  hall!: string;

  @Column({ type: 'integer', name: 'rows' })
  rows!: number;

  @Column({ type: 'integer', name: 'seats' })
  seats!: number;

  @Column({ type: 'integer', name: 'price' })
  price!: number;

  // ключи занятых мест вида '1:2'
  @Column({
    type: 'text',
    array: true,
    name: 'taken',
    default: () => 'ARRAY[]::text[]',
  })
  taken!: string[];
}
