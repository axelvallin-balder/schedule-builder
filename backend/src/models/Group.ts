import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Class } from './Class';
import { Course } from './Course';

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column('simple-array', { name: 'class_ids', default: [] })
  classIds!: string[];

  @Column('simple-array', { name: 'dependent_group_ids', default: [] })
  dependentGroupIds!: string[];

  @Column({ type: 'int', nullable: true })
  size?: number;

  @Column({ name: 'academic_level', nullable: true })
  academicLevel?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations - Many-to-many with classes
  @ManyToMany(() => Class, classEntity => classEntity.groups)
  @JoinTable({
    name: 'group_classes',
    joinColumn: { name: 'group_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'class_id', referencedColumnName: 'id' }
  })
  classes?: Class[];

  @ManyToMany(() => Course, course => course.groups)
  courses?: Course[];
}