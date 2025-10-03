import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export interface TeacherAvailability {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string

  @Column({ type: 'simple-array', default: '' })
  subjectIds: string[]

  @Column({ type: 'jsonb', default: [] })
  availability: TeacherAvailability[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // Getter for compatibility
  get subjects(): string[] {
    return this.subjectIds
  }

  // Setter for compatibility  
  set subjects(value: string[]) {
    this.subjectIds = value
  }

  // Helper method to set default availability (8:15-16:00 Monday-Friday)
  setDefaultAvailability(): void {
    this.availability = [
      { dayOfWeek: 1, startTime: '08:15', endTime: '16:00' }, // Monday
      { dayOfWeek: 2, startTime: '08:15', endTime: '16:00' }, // Tuesday  
      { dayOfWeek: 3, startTime: '08:15', endTime: '16:00' }, // Wednesday
      { dayOfWeek: 4, startTime: '08:15', endTime: '16:00' }, // Thursday
      { dayOfWeek: 5, startTime: '08:15', endTime: '16:00' }, // Friday
    ]
  }
}