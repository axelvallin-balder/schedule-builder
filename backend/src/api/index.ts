import express from 'express';
import { coursesRouter } from './routes/courses';
import { teachersRouter } from './routes/teachers';
import { groupsRouter } from './routes/groups';
import { schedulesRouter } from './routes/schedules';

const router = express.Router();

// Mount route handlers
router.use('/courses', coursesRouter);
router.use('/teachers', teachersRouter);
router.use('/groups', groupsRouter);
router.use('/schedules', schedulesRouter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { router as apiRouter };