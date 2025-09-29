import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Course } from './Course';
import { Teacher } from './Teacher';
import { Schedule } from './Schedule';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'course_id' })
  courseId!: string;

  @Column({ name: 'teacher_id' })
  teacherId!: string;

  @Column({ name: 'schedule_id' })
  scheduleId!: string;

  @Column({ name: 'day_of_week' })
  dayOfWeek!: number;

  @Column({ name: 'start_time' })
  startTime!: string;

  @Column()
  duration!: number;

  @Column({ name: 'room_id', nullable: true })
  roomId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Course)
  course?: Course;

  @ManyToOne(() => Teacher)
  teacher?: Teacher;

  @ManyToOne(() => Schedule)
  schedule?: Schedule;
}