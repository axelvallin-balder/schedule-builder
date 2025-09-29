import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { Subject } from './Subject';
import { Teacher } from './Teacher';
import { Group } from './Group';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'subject_id' })
  subjectId!: string;

  @Column({ name: 'teacher_id', nullable: true })
  teacherId!: string | null;

  @Column('simple-array', { name: 'group_ids' })
  groupIds!: string[];

  @Column({ name: 'weekly_hours', default: 3 })
  weeklyHours!: number;

  @Column({ name: 'number_of_lessons', default: 2 })
  numberOfLessons!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Subject)
  subject?: Subject;

  @ManyToOne(() => Teacher)
  teacher?: Teacher;

  @ManyToMany(() => Group)
  @JoinTable({
    name: 'course_groups',
    joinColumn: { name: 'course_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'group_id', referencedColumnName: 'id' },
  })
  groups?: Group[];
}