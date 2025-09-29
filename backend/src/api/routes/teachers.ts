import express from 'express';
import { AppDataSource } from '../../data-source';
import { Teacher } from '../../models/Teacher';
import { Subject } from '../../models/Subject';

const router = express.Router();

// Validation middleware
const validateTeacherData = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { name, subjectIds, workingHours } = req.body;
  
  // Required fields validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      error: 'Teacher name is required and must be a non-empty string'
    });
  }
  
  if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
    return res.status(400).json({
      error: 'Subject IDs are required and must be a non-empty array'
    });
  }
  
  // Validate working hours format if provided
  if (workingHours) {
    const { start, end } = workingHours;
    
    if (!start || !end || typeof start !== 'string' || typeof end !== 'string') {
      return res.status(400).json({
        error: 'Working hours must include start and end times as strings'
      });
    }
    
    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start) || !timeRegex.test(end)) {
      return res.status(400).json({
        error: 'Working hours must be in HH:MM format (24-hour)'
      });
    }
    
    // Validate time range
    const startTime = new Date(`1970-01-01T${start}:00`);
    const endTime = new Date(`1970-01-01T${end}:00`);
    
    if (startTime >= endTime) {
      return res.status(400).json({
        error: 'End time must be after start time'
      });
    }
  }
  
  next();
};

// GET /api/teachers - List teachers with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const subjectId = req.query.subjectId as string;
    
    const teacherRepository = AppDataSource.getRepository(Teacher);
    const queryBuilder = teacherRepository.createQueryBuilder('teacher');
    
    // Apply filters
    if (subjectId) {
      queryBuilder.andWhere(':subjectId = ANY(teacher.subjectIds)', { subjectId });
    }
    
    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);
    
    const [teachers, total] = await queryBuilder.getManyAndCount();
    
    res.json({
      teachers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      error: 'Internal server error while fetching teachers'
    });
  }
});

// POST /api/teachers - Create a new teacher
router.post('/', validateTeacherData, async (req, res) => {
  try {
    const { name, subjectIds, workingHours } = req.body;
    
    const teacherRepository = AppDataSource.getRepository(Teacher);
    const subjectRepository = AppDataSource.getRepository(Subject);
    
    // Verify all subjects exist
    for (const subjectId of subjectIds) {
      const subject = await subjectRepository.findOneBy({ id: subjectId });
      if (!subject) {
        return res.status(400).json({
          error: `Subject with ID '${subjectId}' not found`
        });
      }
    }
    
    // Create teacher
    const teacher = teacherRepository.create({
      name: name.trim(),
      subjectIds,
      workingHours: workingHours || {
        start: '08:15',
        end: '16:00'
      }
    });
    
    await teacherRepository.save(teacher);
    
    res.status(201).json({
      teacher
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({
      error: 'Internal server error while creating teacher'
    });
  }
});

export { router as teachersRouter };