import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Course } from './Course';
import { Lesson } from './Lesson';

interface WorkingHours {
  start: string;
  end: string;
}

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column('simple-array', { name: 'subject_ids' })
  subjectIds!: string[];

  @Column('jsonb', { name: 'working_hours', default: { start: '08:15', end: '16:00' } })
  workingHours!: WorkingHours;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @OneToMany(() => Course, course => course.teacher)
  courses?: Course[];

  @OneToMany(() => Lesson, lesson => lesson.teacher)
  lessons?: Lesson[];
}