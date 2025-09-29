import express from 'express';
import { AppDataSource } from '../../data-source';
import { Schedule } from '../../models/Schedule';
import { ScheduleGenerator } from '../../services/ScheduleGenerator';

const router = express.Router();

// Validation middleware for schedule generation
const validateScheduleGenerateData = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { name, weekNumber, year } = req.body;
  
  // Required fields validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      error: 'Schedule name is required and must be a non-empty string'
    });
  }
  
  if (typeof weekNumber !== 'number' || weekNumber < 1 || weekNumber > 53) {
    return res.status(400).json({
      error: 'Week number must be between 1 and 53'
    });
  }
  
  if (typeof year !== 'number' || year < 2000 || year > 2100) {
    return res.status(400).json({
      error: 'Year must be between 2000 and 2100'
    });
  }
  
  next();
};

// Validation middleware for alternatives
const validateAlternativesData = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { count } = req.body;
  
  if (count !== undefined && (typeof count !== 'number' || count < 1 || count > 5)) {
    return res.status(400).json({
      error: 'Count must be a number between 1 and 5'
    });
  }
  
  next();
};

// GET /api/schedules - List schedules with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const status = req.query.status as string;
    
    const scheduleRepository = AppDataSource.getRepository(Schedule);
    const queryBuilder = scheduleRepository.createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.lessons', 'lessons');
    
    // Apply filters
    if (status) {
      queryBuilder.andWhere('schedule.status = :status', { status });
    }
    
    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);
    
    const [schedules, total] = await queryBuilder.getManyAndCount();
    
    res.json({
      schedules,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({
      error: 'Internal server error while fetching schedules'
    });
  }
});

// POST /api/schedules/generate - Generate a new schedule
router.post('/generate', validateScheduleGenerateData, async (req, res) => {
  try {
    const { name, weekNumber, year } = req.body;
    
    const scheduleRepository = AppDataSource.getRepository(Schedule);
    
    // Create initial schedule
    const schedule = scheduleRepository.create({
      name: name.trim(),
      weekNumber,
      year,
      status: 'draft'
    });
    
    await scheduleRepository.save(schedule);
    
    // Generate schedule using ScheduleGenerator service
    const generator = new ScheduleGenerator();
    
    // TODO: In a real implementation, fetch courses, teachers, and groups from database
    const result = await generator.generateSchedule({
      courses: [], // Would fetch from database
      teachers: [],
      groups: [],
      weekNumber,
      year
    });
    
    // Update schedule with generated lessons and status
    if (result.status === 'success' || result.status === 'partial') {
      schedule.lessons = result.schedule.lessons || [];
      schedule.status = result.status === 'success' ? 'active' : 'draft';
    } else {
      schedule.status = 'draft'; // Keep as draft on failure
    }
    
    await scheduleRepository.save(schedule);
    
    // Fetch the updated schedule with relations
    const savedSchedule = await scheduleRepository.findOne({
      where: { id: schedule.id },
      relations: ['lessons']
    });
    
    res.status(201).json({
      schedule: savedSchedule,
      status: result.status,
      messages: result.messages || ['Schedule generation completed']
    });
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({
      error: 'Internal server error while generating schedule'
    });
  }
});

// POST /api/schedules/:id/alternatives - Generate alternative schedules
router.post('/:id/alternatives', validateAlternativesData, async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const { count = 1 } = req.body;
    
    const scheduleRepository = AppDataSource.getRepository(Schedule);
    
    // Verify base schedule exists
    const baseSchedule = await scheduleRepository.findOneBy({ id: scheduleId });
    if (!baseSchedule) {
      return res.status(404).json({
        error: 'Schedule not found'
      });
    }
    
    const schedules = [];
    const generator = new ScheduleGenerator();
    
    // Generate multiple alternative schedules
    for (let i = 0; i < Math.min(count, 5); i++) {
      // TODO: In a real implementation, fetch courses, teachers, and groups from database
      const result = await generator.generateSchedule({
        courses: [], // Would fetch from database
        teachers: [],
        groups: [],
        weekNumber: baseSchedule.weekNumber,
        year: baseSchedule.year
      });
      
      if (result.status === 'success' || result.status === 'partial') {
        const altSchedule = scheduleRepository.create({
          name: `${baseSchedule.name} - Alternative ${i + 1}`,
          weekNumber: baseSchedule.weekNumber,
          year: baseSchedule.year,
          status: 'draft',
          lessons: result.schedule.lessons || []
        });
        
        await scheduleRepository.save(altSchedule);
        schedules.push(altSchedule);
      }
    }
    
    res.json({
      schedules,
      status: 'success',
      messages: [`Generated ${schedules.length} alternative schedule${schedules.length !== 1 ? 's' : ''}`]
    });
  } catch (error) {
    console.error('Error generating alternative schedules:', error);
    res.status(500).json({
      error: 'Internal server error while generating alternatives'
    });
  }
});

export { router as schedulesRouter };