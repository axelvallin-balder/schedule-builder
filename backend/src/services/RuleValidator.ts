interface Lesson {
  id?: string;
  courseId?: string;
  teacherId?: string;
  dayOfWeek: number;
  startTime: string;
  duration: number;
  groupIds?: string[];
}

interface Teacher {
  id: string;
  workingHours: {
    start: string;
    end: string;
  };
}

interface Subject {
  id: string;
  breakDuration: number;
}

interface Group {
  id: string;
  dependentGroupIds: string[];
}

interface Class {
  id: string;
  lunchDuration: number;
}

interface Course {
  id: string;
}

interface Schedule {
  lessons: Lesson[];
}

interface ValidationContext {
  teachers: Teacher[];
  groups: Group[];
  subjects: Subject[];
  classes: Class[];
}

interface ValidationResult {
  isValid: boolean;
  violations: string[];
}

export class RuleValidator {
  constructor() {
    // Initialize the rule validator
  }

  validateLessonDuration(lesson: Lesson): boolean {
    return lesson.duration >= 45;
  }

  validateTeacherWorkingHours(teacher: Teacher, lesson: Lesson): boolean {
    const lessonStart = this.timeToMinutes(lesson.startTime);
    const lessonEnd = lessonStart + lesson.duration;
    
    const workStart = this.timeToMinutes(teacher.workingHours.start);
    const workEnd = this.timeToMinutes(teacher.workingHours.end);
    
    return lessonStart >= workStart && lessonEnd <= workEnd;
  }

  validateBreakDuration(subject: Subject, lesson1: Lesson, lesson2: Lesson): boolean {
    const lesson1End = this.timeToMinutes(lesson1.startTime) + lesson1.duration;
    const lesson2Start = this.timeToMinutes(lesson2.startTime);
    
    const breakTime = lesson2Start - lesson1End;
    return breakTime >= subject.breakDuration;
  }

  validateMaxLessonsPerDay(
    course: Course,
    dayOfWeek: number,
    existingLessons: Lesson[],
    newLesson: Lesson
  ): boolean {
    const courseLessonsOnDay = existingLessons.filter(
      lesson => lesson.courseId === course.id && lesson.dayOfWeek === dayOfWeek
    );
    
    // Maximum 2 lessons per course per day
    return courseLessonsOnDay.length < 2;
  }

  validateDependentGroups(group: Group, lesson1: Lesson, lesson2: Lesson): boolean {
    // Check if lessons overlap and involve dependent groups
    if (!lesson1.groupIds || !lesson2.groupIds) return true;
    
    const lesson1HasGroup = lesson1.groupIds.includes(group.id);
    const lesson2HasDependentGroup = lesson2.groupIds.some(groupId => 
      group.dependentGroupIds.includes(groupId)
    );
    
    if (!lesson1HasGroup || !lesson2HasDependentGroup) return true;
    
    // Check for time overlap
    const lesson1Start = this.timeToMinutes(lesson1.startTime);
    const lesson1End = lesson1Start + lesson1.duration;
    const lesson2Start = this.timeToMinutes(lesson2.startTime);
    const lesson2End = lesson2Start + lesson2.duration;
    
    // No overlap if one ends before the other starts
    return lesson1End <= lesson2Start || lesson2End <= lesson1Start;
  }

  validateLunchPeriod(classEntity: Class, lessons: Lesson[]): boolean {
    // Check if any lesson extends past 12:30 and validate lunch period
    const lunchStart = 12 * 60 + 30; // 12:30 in minutes
    
    for (let i = 0; i < lessons.length - 1; i++) {
      const currentLesson = lessons[i];
      const nextLesson = lessons[i + 1];
      
      const currentEnd = this.timeToMinutes(currentLesson.startTime) + currentLesson.duration;
      const nextStart = this.timeToMinutes(nextLesson.startTime);
      
      // If current lesson extends past 12:30 and next lesson is too soon
      if (currentEnd > lunchStart && nextStart - currentEnd < classEntity.lunchDuration) {
        return false;
      }
    }
    
    return true;
  }

  validateSchedule(schedule: Schedule, context: ValidationContext): ValidationResult {
    const violations: string[] = [];
    
    for (const lesson of schedule.lessons) {
      // Validate lesson duration
      if (!this.validateLessonDuration(lesson)) {
        violations.push(`Lesson ${lesson.id} has invalid duration: ${lesson.duration} minutes`);
      }
      
      // Validate teacher working hours
      if (lesson.teacherId) {
        const teacher = context.teachers.find(t => t.id === lesson.teacherId);
        if (teacher && !this.validateTeacherWorkingHours(teacher, lesson)) {
          violations.push(`Lesson ${lesson.id} is outside teacher working hours`);
        }
      }
      
      // Validate day of week
      if (lesson.dayOfWeek < 1 || lesson.dayOfWeek > 5) {
        violations.push(`Lesson ${lesson.id} has invalid day of week: ${lesson.dayOfWeek}`);
      }
    }
    
    // Check for overlapping lessons for same teacher
    this.validateTeacherConflicts(schedule.lessons, violations);
    
    // Check dependent group conflicts
    this.validateGroupDependencies(schedule.lessons, context.groups, violations);
    
    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  private validateTeacherConflicts(lessons: Lesson[], violations: string[]): void {
    const teacherLessons = new Map<string, Lesson[]>();
    
    // Group lessons by teacher
    for (const lesson of lessons) {
      if (lesson.teacherId) {
        if (!teacherLessons.has(lesson.teacherId)) {
          teacherLessons.set(lesson.teacherId, []);
        }
        teacherLessons.get(lesson.teacherId)!.push(lesson);
      }
    }
    
    // Check for conflicts within each teacher's lessons
    for (const [teacherId, teacherLessonList] of teacherLessons) {
      for (let i = 0; i < teacherLessonList.length; i++) {
        for (let j = i + 1; j < teacherLessonList.length; j++) {
          const lesson1 = teacherLessonList[i];
          const lesson2 = teacherLessonList[j];
          
          if (lesson1.dayOfWeek === lesson2.dayOfWeek) {
            if (this.lessonsOverlap(lesson1, lesson2)) {
              violations.push(
                `Teacher ${teacherId} has overlapping lessons: ${lesson1.id} and ${lesson2.id}`
              );
            }
          }
        }
      }
    }
  }

  private validateGroupDependencies(
    lessons: Lesson[],
    groups: Group[],
    violations: string[]
  ): void {
    for (let i = 0; i < lessons.length; i++) {
      for (let j = i + 1; j < lessons.length; j++) {
        const lesson1 = lessons[i];
        const lesson2 = lessons[j];
        
        if (lesson1.dayOfWeek === lesson2.dayOfWeek && this.lessonsOverlap(lesson1, lesson2)) {
          // Check if any groups in lesson1 are dependent on groups in lesson2
          for (const group of groups) {
            if (!this.validateDependentGroups(group, lesson1, lesson2)) {
              violations.push(
                `Dependent groups conflict between lessons ${lesson1.id} and ${lesson2.id}`
              );
            }
          }
        }
      }
    }
  }

  private lessonsOverlap(lesson1: Lesson, lesson2: Lesson): boolean {
    const lesson1Start = this.timeToMinutes(lesson1.startTime);
    const lesson1End = lesson1Start + lesson1.duration;
    const lesson2Start = this.timeToMinutes(lesson2.startTime);
    const lesson2End = lesson2Start + lesson2.duration;
    
    return !(lesson1End <= lesson2Start || lesson2End <= lesson1Start);
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}