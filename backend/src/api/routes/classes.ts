import express from 'express';
import { AppDataSource } from '../../data-source';
import { Class } from '../../models/Class';

const router = express.Router();

// Validation middleware
const validateClass = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { name, lunchDuration, academicYear, level } = req.body;
  
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required and must be a string' });
  }
  
  if (lunchDuration !== undefined && (typeof lunchDuration !== 'number' || lunchDuration < 0)) {
    return res.status(400).json({ error: 'Lunch duration must be a non-negative number' });
  }
  
  if (academicYear !== undefined && typeof academicYear !== 'string') {
    return res.status(400).json({ error: 'Academic year must be a string' });
  }
  
  if (level !== undefined && typeof level !== 'string') {
    return res.status(400).json({ error: 'Level must be a string' });
  }
  
  next();
};

// GET /api/classes - Get all classes
router.get('/', async (req, res) => {
  try {
    const classRepository = AppDataSource.getRepository(Class);
    const classes = await classRepository.find();
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/classes/:id - Get class by ID
router.get('/:id', async (req, res) => {
  try {
    const classRepository = AppDataSource.getRepository(Class);
    const classEntity = await classRepository.findOne({
      where: { id: req.params.id },
      relations: ['groups']
    });
    
    if (!classEntity) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    res.json(classEntity);
  } catch (error) {
    console.error('Error fetching class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/classes - Create new class
router.post('/', validateClass, async (req, res) => {
  try {
    const classRepository = AppDataSource.getRepository(Class);
    const { name, lunchDuration, academicYear, level } = req.body;
    
    // Check if class with same name already exists
    const existingClass = await classRepository.findOne({
      where: { name }
    });
    
    if (existingClass) {
      return res.status(400).json({ error: 'Class with this name already exists' });
    }
    
    const classEntity = classRepository.create({
      name,
      lunchDuration: lunchDuration || 30,
      academicYear,
      level
    });
    
    const savedClass = await classRepository.save(classEntity);
    res.status(201).json(savedClass);
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/classes/:id - Update class
router.put('/:id', validateClass, async (req, res) => {
  try {
    const classRepository = AppDataSource.getRepository(Class);
    const { name, lunchDuration, academicYear, level } = req.body;
    
    const classEntity = await classRepository.findOne({
      where: { id: req.params.id }
    });
    
    if (!classEntity) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Check if another class with same name already exists
    const existingClass = await classRepository.findOne({
      where: { name }
    });
    
    if (existingClass && existingClass.id !== classEntity.id) {
      return res.status(400).json({ error: 'Class with this name already exists' });
    }
    
    classEntity.name = name;
    classEntity.lunchDuration = lunchDuration || 30;
    classEntity.academicYear = academicYear;
    classEntity.level = level;
    
    const updatedClass = await classRepository.save(classEntity);
    res.json(updatedClass);
  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/classes/:id - Delete class
router.delete('/:id', async (req, res) => {
  try {
    const classRepository = AppDataSource.getRepository(Class);
    
    const classEntity = await classRepository.findOne({
      where: { id: req.params.id }
    });
    
    if (!classEntity) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    await classRepository.remove(classEntity);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as classesRouter };