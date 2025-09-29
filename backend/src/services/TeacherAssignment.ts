interface Course {
  id: string;
  subjectId: string;
  teacherId: string | null;
  groupIds: string[];
  weeklyHours?: number;
  preferredTimeSlots?: {
    dayOfWeek: number;
    startTime: string;
  }[];
}

interface Teacher {
  id: string;
  name?: string;
  subjectIds: string[];
  workingHours: {
    start: string;
    end: string;
  };
  currentLoad?: number;
  maxLoad?: number;
}

interface Assignment {
  courseId: string;
  teacherId: string | null;
  wasPreAssigned?: boolean;
  reason?: string;
}

interface ValidationResult {
  isValid: boolean;
  reasons: string[];
}

export class TeacherAssignment {
  constructor() {
    // Initialize the teacher assignment service
  }

  assignTeachers(courses: Course[], teachers: Teacher[]): Assignment[] {
    const assignments: Assignment[] = [];
    const teacherLoads = new Map<string, number>();
    
    // Initialize teacher loads
    for (const teacher of teachers) {
      teacherLoads.set(teacher.id, teacher.currentLoad || 0);
    }
    
    for (const course of courses) {
      if (course.teacherId) {
        // Course already has a teacher assigned
        assignments.push({
          courseId: course.id,
          teacherId: course.teacherId,
          wasPreAssigned: true,
        });
      } else {
        // Find the best teacher for this course
        const assignment = this.findBestTeacher(course, teachers, teacherLoads);
        assignments.push(assignment);
        
        // Update teacher load if assignment was successful
        if (assignment.teacherId) {
          const currentLoad = teacherLoads.get(assignment.teacherId) || 0;
          teacherLoads.set(assignment.teacherId, currentLoad + (course.weeklyHours || 3));
        }
      }
    }
    
    return assignments;
  }

  private findBestTeacher(
    course: Course,
    teachers: Teacher[],
    teacherLoads: Map<string, number>
  ): Assignment {
    // Find qualified teachers
    const qualifiedTeachers = teachers.filter(teacher => 
      teacher.subjectIds.includes(course.subjectId)
    );
    
    if (qualifiedTeachers.length === 0) {
      return {
        courseId: course.id,
        teacherId: null,
        reason: `No qualified teacher found for subject: ${course.subjectId}`,
      };
    }
    
    // Score teachers based on various criteria
    const scoredTeachers = qualifiedTeachers.map(teacher => ({
      teacher,
      score: this.calculateTeacherScore(teacher, course, teacherLoads),
    }));
    
    // Sort by score (higher is better)
    scoredTeachers.sort((a, b) => b.score - a.score);
    
    const bestTeacher = scoredTeachers[0].teacher;
    
    // Check if teacher can handle the additional load
    const currentLoad = teacherLoads.get(bestTeacher.id) || 0;
    const maxLoad = bestTeacher.maxLoad || 25; // Default max load
    const courseLoad = course.weeklyHours || 3;
    
    if (currentLoad + courseLoad > maxLoad) {
      return {
        courseId: course.id,
        teacherId: null,
        reason: `Best qualified teacher ${bestTeacher.id} would exceed max load`,
      };
    }
    
    return {
      courseId: course.id,
      teacherId: bestTeacher.id,
    };
  }

  private calculateTeacherScore(
    teacher: Teacher,
    course: Course,
    teacherLoads: Map<string, number>
  ): number {
    let score = 100; // Base score
    
    // Prefer teachers with lower current load (load balancing)
    const currentLoad = teacherLoads.get(teacher.id) || 0;
    const maxLoad = teacher.maxLoad || 25;
    const loadRatio = currentLoad / maxLoad;
    score -= loadRatio * 50; // Reduce score based on current load
    
    // Prefer teachers qualified for multiple subjects (versatility bonus)
    if (teacher.subjectIds.length > 1) {
      score += 10;
    }
    
    // Check time compatibility if course has preferred time slots
    if (course.preferredTimeSlots && course.preferredTimeSlots.length > 0) {
      const compatible = course.preferredTimeSlots.some(slot => 
        this.isTimeCompatible(teacher, slot.startTime)
      );
      if (compatible) {
        score += 20;
      } else {
        score -= 30; // Penalize if not compatible
      }
    }
    
    return score;
  }

  private isTimeCompatible(teacher: Teacher, startTime: string): boolean {
    const startMinutes = this.timeToMinutes(startTime);
    const workStartMinutes = this.timeToMinutes(teacher.workingHours.start);
    const workEndMinutes = this.timeToMinutes(teacher.workingHours.end);
    
    // Assume lesson duration of 45 minutes
    const endMinutes = startMinutes + 45;
    
    return startMinutes >= workStartMinutes && endMinutes <= workEndMinutes;
  }

  validateAssignment(
    assignment: Assignment,
    course: Course,
    teacher: Teacher
  ): ValidationResult {
    const reasons: string[] = [];
    let isValid = true;
    
    // Check if teacher is qualified for the subject
    if (!teacher.subjectIds.includes(course.subjectId)) {
      isValid = false;
      reasons.push('Teacher not qualified for subject');
    } else {
      reasons.push('Qualified for subject');
    }
    
    // Check load capacity
    const currentLoad = teacher.currentLoad || 0;
    const maxLoad = teacher.maxLoad || 25;
    const courseLoad = course.weeklyHours || 3;
    
    if (currentLoad + courseLoad <= maxLoad) {
      reasons.push('Within load capacity');
    } else {
      isValid = false;
      reasons.push('Would exceed load capacity');
    }
    
    // Check time compatibility
    if (course.preferredTimeSlots && course.preferredTimeSlots.length > 0) {
      const compatible = course.preferredTimeSlots.some(slot => 
        this.isTimeCompatible(teacher, slot.startTime)
      );
      if (compatible) {
        reasons.push('Compatible with preferred time slots');
      } else {
        isValid = false;
        reasons.push('Incompatible with preferred time slots');
      }
    }
    
    return { isValid, reasons };
  }

  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}