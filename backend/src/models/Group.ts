import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany } from 'typeorm';
import { Class } from './Class';
import { Course } from './Course';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ name: 'class_id' })
  classId!: string;

  @Column('simple-array', { name: 'dependent_group_ids', default: [] })
  dependentGroupIds!: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Class)
  class?: Class;

  @ManyToMany(() => Course, course => course.groups)
  courses?: Course[];
}