import express from 'express';
import { AppDataSource } from '../../data-source';
import { Subject } from '../../models/Subject';

const router = express.Router();

// Validation middleware
const validateSubject = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { name, breakDuration } = req.body;
  
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required and must be a string' });
  }
  
  if (breakDuration !== undefined && (typeof breakDuration !== 'number' || breakDuration < 0)) {
    return res.status(400).json({ error: 'Break duration must be a non-negative number' });
  }
  
  next();
};

// GET /api/subjects - Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjectRepository = AppDataSource.getRepository(Subject);
    const subjects = await subjectRepository.find();
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/subjects/:id - Get subject by ID
router.get('/:id', async (req, res) => {
  try {
    const subjectRepository = AppDataSource.getRepository(Subject);
    const subject = await subjectRepository.findOne({
      where: { id: req.params.id }
    });
    
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    res.json(subject);
  } catch (error) {
    console.error('Error fetching subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/subjects - Create new subject
router.post('/', validateSubject, async (req, res) => {
  try {
    const subjectRepository = AppDataSource.getRepository(Subject);
    const { name, breakDuration } = req.body;
    
    // Check if subject with same name already exists
    const existingSubject = await subjectRepository.findOne({
      where: { name }
    });
    
    if (existingSubject) {
      return res.status(400).json({ error: 'Subject with this name already exists' });
    }
    
    const subject = subjectRepository.create({
      name,
      breakDuration: breakDuration || 10
    });
    
    const savedSubject = await subjectRepository.save(subject);
    res.status(201).json(savedSubject);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/subjects/:id - Update subject
router.put('/:id', validateSubject, async (req, res) => {
  try {
    const subjectRepository = AppDataSource.getRepository(Subject);
    const { name, breakDuration } = req.body;
    
    const subject = await subjectRepository.findOne({
      where: { id: req.params.id }
    });
    
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    // Check if another subject with same name already exists
    const existingSubject = await subjectRepository.findOne({
      where: { name }
    });
    
    if (existingSubject && existingSubject.id !== subject.id) {
      return res.status(400).json({ error: 'Subject with this name already exists' });
    }
    
    subject.name = name;
    subject.breakDuration = breakDuration || 10;
    
    const updatedSubject = await subjectRepository.save(subject);
    res.json(updatedSubject);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/subjects/:id - Delete subject
router.delete('/:id', async (req, res) => {
  try {
    const subjectRepository = AppDataSource.getRepository(Subject);
    
    const subject = await subjectRepository.findOne({
      where: { id: req.params.id }
    });
    
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    await subjectRepository.remove(subject);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as subjectsRouter };