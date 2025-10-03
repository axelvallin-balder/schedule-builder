import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm';
import { Group } from './Group';

@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ name: 'lunch_duration', default: 30 })
  lunchDuration!: number;

  @Column({ name: 'academic_year', nullable: true })
  academicYear?: string;

  @Column({ nullable: true })
  level?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations - Many-to-many with groups
  @ManyToMany(() => Group, group => group.classes)
  groups?: Group[];
}