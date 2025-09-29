import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Lesson } from './Lesson';

type ScheduleStatus = 'draft' | 'active' | 'archived';

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ name: 'week_number' })
  weekNumber!: number;

  @Column()
  year!: number;

  @Column({ type: 'enum', enum: ['draft', 'active', 'archived'], default: 'draft' })
  status!: ScheduleStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @OneToMany(() => Lesson, lesson => lesson.schedule)
  lessons?: Lesson[];
}