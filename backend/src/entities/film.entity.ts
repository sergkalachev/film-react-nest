import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Schedule } from './schedule.entity';

@Entity({ name: 'films' })
export class Film {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column({ type: 'varchar', length: 255, name: 'title', nullable: true })
  title?: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, name: 'image', nullable: true })
  image?: string;

  @Column({ type: 'varchar', length: 255, name: 'cover', nullable: true })
  cover?: string;

  @OneToMany(() => Schedule, (s) => s.film)
  schedules!: Schedule[];
}
