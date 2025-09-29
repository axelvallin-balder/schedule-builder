import express from 'express';
import { AppDataSource } from '../../data-source';
import { Course } from '../../models/Course';
import { Subject } from '../../models/Subject';

const router = express.Router();

// Validation middleware
const validateCourseData = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { subjectId, groupIds, weeklyHours, numberOfLessons } = req.body;
  
  // Required fields validation
  if (!subjectId || typeof subjectId !== 'string') {
    return res.status(400).json({
      error: 'Subject ID is required and must be a string'
    });
  }
  
  if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
    return res.status(400).json({
      error: 'Group IDs are required and must be a non-empty array'
    });
  }
  
  if (weeklyHours !== undefined && (typeof weeklyHours !== 'number' || weeklyHours <= 0)) {
    return res.status(400).json({
      error: 'Weekly hours must be a positive number if provided'
    });
  }
  
  if (numberOfLessons !== undefined && (typeof numberOfLessons !== 'number' || numberOfLessons <= 0)) {
    return res.status(400).json({
      error: 'Number of lessons must be a positive number if provided'
    });
  }
  
  next();
};

// GET /api/courses - List courses with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const subjectId = req.query.subjectId as string;
    
    const courseRepository = AppDataSource.getRepository(Course);
    const queryBuilder = courseRepository.createQueryBuilder('course')
      .leftJoinAndSelect('course.subject', 'subject')
      .leftJoinAndSelect('course.teacher', 'teacher');
    
    // Apply filters
    if (subjectId) {
      queryBuilder.andWhere('course.subjectId = :subjectId', { subjectId });
    }
    
    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);
    
    const [courses, total] = await queryBuilder.getManyAndCount();
    
    res.json({
      courses,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      error: 'Internal server error while fetching courses'
    });
  }
});

// POST /api/courses - Create a new course
router.post('/', validateCourseData, async (req, res) => {
  try {
    const { subjectId, teacherId, groupIds, weeklyHours, numberOfLessons } = req.body;
    
    const courseRepository = AppDataSource.getRepository(Course);
    const subjectRepository = AppDataSource.getRepository(Subject);
    
    // Verify subject exists
    const subject = await subjectRepository.findOneBy({ id: subjectId });
    if (!subject) {
      return res.status(400).json({
        error: 'Subject not found'
      });
    }
    
    // Create course
    const course = courseRepository.create({
      subjectId,
      teacherId: teacherId || null,
      groupIds,
      weeklyHours: weeklyHours || 3, // Default to 3 hours per week
      numberOfLessons: numberOfLessons || 2 // Default to 2 lessons per week
    });
    
    await courseRepository.save(course);
    
    // Fetch the course with relations
    const savedCourse = await courseRepository.findOne({
      where: { id: course.id },
      relations: ['subject', 'teacher']
    });
    
    res.status(201).json({
      course: savedCourse
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({
      error: 'Internal server error while creating course'
    });
  }
});

export { router as coursesRouter };