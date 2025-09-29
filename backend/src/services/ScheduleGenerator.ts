interface Course {
  id: string;
  subjectId: string;
  teacherId: string | null;
  groupIds: string[];
  weeklyHours: number;
  numberOfLessons: number;
}

interface Teacher {
  id: string;
  name: string;
  subjectIds: string[];
  workingHours: {
    start: string;
    end: string;
  };
}

interface Group {
  id: string;
  name: string;
  classId: string;
  dependentGroupIds: string[];
}

interface GenerateScheduleParams {
  courses: Course[];
  teachers: Teacher[];
  groups: Group[];
  weekNumber: number;
  year: number;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  duration: number;
  weight?: number;
}

interface ScheduleResult {
  schedule: {
    id?: string;
    name: string;
    weekNumber: number;
    year: number;
    lessons: any[];
  };
  status: 'success' | 'partial' | 'failed';
  messages: string[];
}

export class ScheduleGenerator {
  constructor() {
    // Initialize the schedule generator
  }

  async generateSchedule(params: GenerateScheduleParams): Promise<ScheduleResult> {
    try {
      const { courses, teachers, groups, weekNumber, year } = params;
      
      // Sort courses by constraints (most constrained first)
      const sortedCourses = this.sortCoursesByConstraints(courses);
      
      const lessons: any[] = [];
      const messages: string[] = [];
      let status: 'success' | 'partial' | 'failed' = 'success';

      // Generate lessons for each course
      for (const course of sortedCourses) {
        try {
          const courseLessons = await this.generateLessonsForCourse(
            course,
            teachers,
            groups,
            lessons
          );
          lessons.push(...courseLessons);
        } catch (error) {
          messages.push(`Failed to schedule course ${course.id}: ${error}`);
          status = 'partial';
        }
      }

      // Check if we failed to schedule any courses
      if (lessons.length === 0) {
        status = 'failed';
        messages.push('No lessons could be scheduled');
      }

      return {
        schedule: {
          name: `Week ${weekNumber} Schedule`,
          weekNumber,
          year,
          lessons,
        },
        status,
        messages,
      };
    } catch (error) {
      return {
        schedule: {
          name: `Week ${params.weekNumber} Schedule`,
          weekNumber: params.weekNumber,
          year: params.year,
          lessons: [],
        },
        status: 'failed',
        messages: [`Schedule generation failed: ${error}`],
      };
    }
  }

  sortCoursesByConstraints(courses: Course[]): Course[] {
    return courses.sort((a, b) => {
      // Sort by total constraints (higher number = more constrained)
      const aConstraints = a.weeklyHours + a.numberOfLessons + a.groupIds.length;
      const bConstraints = b.weeklyHours + b.numberOfLessons + b.groupIds.length;
      return bConstraints - aConstraints;
    });
  }

  generateValidTimeSlots(teacher: any, constraints: any): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const { duration = 45, breakDuration = 10 } = constraints;
    
    // Parse working hours
    const startHour = parseInt(teacher.workingHours.start.split(':')[0]);
    const startMinute = parseInt(teacher.workingHours.start.split(':')[1]);
    const endHour = parseInt(teacher.workingHours.end.split(':')[0]);
    const endMinute = parseInt(teacher.workingHours.end.split(':')[1]);
    
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;
    
    // Generate slots every 15 minutes within working hours
    for (let time = startTimeInMinutes; time <= endTimeInMinutes - duration; time += 15) {
      const startTime = this.minutesToTimeString(time);
      const endTime = this.minutesToTimeString(time + duration);
      
      slots.push({
        startTime,
        endTime,
        duration,
        weight: 1.0, // Default weight
      });
    }
    
    return slots;
  }

  selectRandomSlot(availableSlots: any[], seed?: number): any {
    if (availableSlots.length === 0) return null;
    
    // Use seed for reproducibility if provided
    let randomValue = seed ? this.seededRandom(seed) : Math.random();
    
    // Weighted selection based on slot weights
    const totalWeight = availableSlots.reduce((sum, slot) => sum + (slot.weight || 1), 0);
    let currentWeight = 0;
    
    for (const slot of availableSlots) {
      currentWeight += slot.weight || 1;
      if (randomValue * totalWeight <= currentWeight) {
        return slot;
      }
    }
    
    // Fallback to last slot
    return availableSlots[availableSlots.length - 1];
  }

  private async generateLessonsForCourse(
    course: Course,
    teachers: Teacher[],
    groups: Group[],
    existingLessons: any[]
  ): Promise<any[]> {
    const lessons: any[] = [];
    
    // Find the teacher for this course
    const teacher = teachers.find(t => t.id === course.teacherId);
    if (!teacher) {
      throw new Error(`Teacher not found for course ${course.id}`);
    }
    
    // Generate the required number of lessons
    for (let i = 0; i < course.numberOfLessons; i++) {
      const lesson = await this.generateSingleLesson(
        course,
        teacher,
        groups,
        [...existingLessons, ...lessons]
      );
      
      if (lesson) {
        lessons.push(lesson);
      } else {
        throw new Error(`Could not generate lesson ${i + 1} for course ${course.id}`);
      }
    }
    
    return lessons;
  }

  private async generateSingleLesson(
    course: Course,
    teacher: Teacher,
    groups: Group[],
    existingLessons: any[]
  ): Promise<any | null> {
    // Try each day of the week (Monday-Friday)
    for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
      const validSlots = this.generateValidTimeSlots(teacher, {
        dayOfWeek,
        duration: 45,
        breakDuration: 10,
        existingLessons,
      });
      
      if (validSlots.length > 0) {
        const selectedSlot = this.selectRandomSlot(validSlots);
        
        return {
          id: `lesson-${Date.now()}-${Math.random()}`,
          courseId: course.id,
          teacherId: teacher.id,
          dayOfWeek,
          startTime: selectedSlot.startTime,
          duration: 45,
          roomId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    }
    
    return null; // Could not schedule
  }

  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private seededRandom(seed: number): number {
    // Simple seeded random number generator
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
}