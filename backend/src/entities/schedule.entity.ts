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
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'filmId' })
  filmId!: string;

  @ManyToOne(() => Film, (film) => film.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'filmId', referencedColumnName: 'id' })
  film!: Film;

  @Column({ type: 'timestamptz', name: 'daytime' })
  daytime!: Date;

  @Column({ type: 'integer', name: 'hall' })
  hall!: number;

  @Column({ type: 'integer', name: 'rows' })
  rows!: number;

  @Column({ type: 'integer', name: 'seats' })
  seats!: number;

  @Column({ type: 'integer', name: 'price' })
  price!: number;

  @Column({
    type: 'text',
    array: true,
    name: 'taken',
    default: () => 'ARRAY[]::text[]',
  })
  taken!: string[];
}
