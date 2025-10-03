import express from 'express';
import { AppDataSource } from '../../data-source';
import { Teacher } from '../../models/Teacher';
import { Subject } from '../../models/Subject';

const router = express.Router();

// Validation middleware
const validateTeacherData = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { name, email, subjectIds, availability } = req.body;
  
  // Required fields validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      error: 'Teacher name is required and must be a non-empty string'
    });
  }
  
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    return res.status(400).json({
      error: 'Teacher email is required and must be a non-empty string'
    });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Valid email address is required'
    });
  }
  
  if (subjectIds && !Array.isArray(subjectIds)) {
    return res.status(400).json({
      error: 'Subject IDs must be an array'
    });
  }
  
  // Validate availability format if provided
  if (availability) {
    if (!Array.isArray(availability)) {
      return res.status(400).json({
        error: 'Availability must be an array'
      });
    }
    
    for (const slot of availability) {
      if (!slot.dayOfWeek || !slot.startTime || !slot.endTime) {
        return res.status(400).json({
          error: 'Each availability slot must have dayOfWeek, startTime, and endTime'
        });
      }
      
      // Validate day of week (0-6)
      if (typeof slot.dayOfWeek !== 'number' || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        return res.status(400).json({
          error: 'dayOfWeek must be a number between 0 (Sunday) and 6 (Saturday)'
        });
      }
      
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
        return res.status(400).json({
          error: 'Time slots must be in HH:MM format (24-hour)'
        });
      }
      
      // Validate time range
      const startTime = new Date(`1970-01-01T${slot.startTime}:00`);
      const endTime = new Date(`1970-01-01T${slot.endTime}:00`);
      
      if (startTime >= endTime) {
        return res.status(400).json({
          error: 'End time must be after start time for each availability slot'
        });
      }
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
    const { name, email, subjectIds, availability } = req.body;
    
    const teacherRepository = AppDataSource.getRepository(Teacher);
    const subjectRepository = AppDataSource.getRepository(Subject);
    
    // Verify all subjects exist if provided
    if (subjectIds && subjectIds.length > 0) {
      for (const subjectId of subjectIds) {
        const subject = await subjectRepository.findOneBy({ id: subjectId });
        if (!subject) {
          return res.status(400).json({
            error: `Subject with ID '${subjectId}' not found`
          });
        }
      }
    }
    
    // Create teacher
    const teacher = teacherRepository.create({
      name: name.trim(),
      email: email.trim(),
      subjectIds: subjectIds || [],
      availability: availability || []
    });
    
    // Set default availability if none provided
    if (!availability || availability.length === 0) {
      teacher.setDefaultAvailability();
    }
    
    await teacherRepository.save(teacher);
    
    res.status(201).json({
      teacher
    });
  } catch (error: any) {
    console.error('Error creating teacher:', error);
    
    // Handle unique constraint violation for email
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Teacher with this email already exists'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error while creating teacher'
    });
  }
});

// PUT /api/teachers/:id - Update a teacher
router.put('/:id', async (req, res) => {
  try {
    const { name, email, subjectIds, availability } = req.body;
    
    const teacherRepository = AppDataSource.getRepository(Teacher);
    const subjectRepository = AppDataSource.getRepository(Subject);
    
    // Find the teacher
    const teacher = await teacherRepository.findOneBy({ id: req.params.id });
    if (!teacher) {
      return res.status(404).json({
        error: 'Teacher not found'
      });
    }
    
    // Verify all subjects exist if provided
    if (subjectIds && subjectIds.length > 0) {
      for (const subjectId of subjectIds) {
        const subject = await subjectRepository.findOneBy({ id: subjectId });
        if (!subject) {
          return res.status(400).json({
            error: `Subject with ID '${subjectId}' not found`
          });
        }
      }
    }
    
    // Update teacher fields
    teacher.name = name.trim();
    teacher.email = email.trim();
    teacher.subjectIds = subjectIds || [];
    teacher.availability = availability || [];
    
    // Set default availability if none provided
    if (!availability || availability.length === 0) {
      teacher.setDefaultAvailability();
    }
    
    await teacherRepository.save(teacher);
    
    res.json({
      teacher
    });
  } catch (error: any) {
    console.error('Error updating teacher:', error);
    
    // Handle unique constraint violation for email
    if (error.code === '23505') {
      return res.status(400).json({
        error: 'Teacher with this email already exists'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error while updating teacher'
    });
  }
});

// DELETE /api/teachers/:id - Delete a teacher
router.delete('/:id', async (req, res) => {
  try {
    const teacherRepository = AppDataSource.getRepository(Teacher);
    
    const teacher = await teacherRepository.findOneBy({ id: req.params.id });
    if (!teacher) {
      return res.status(404).json({
        error: 'Teacher not found'
      });
    }
    
    await teacherRepository.remove(teacher);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({
      error: 'Internal server error while deleting teacher'
    });
  }
});

export { router as teachersRouter };