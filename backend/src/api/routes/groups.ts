import express from 'express';
import { AppDataSource } from '../../data-source';
import { Group } from '../../models/Group';
import { Class } from '../../models/Class';

const router = express.Router();

// Validation middleware
const validateGroupData = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { name, classId, dependentGroupIds } = req.body;
  
  // Required fields validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      error: 'Group name is required and must be a non-empty string'
    });
  }
  
  if (!classId || typeof classId !== 'string') {
    return res.status(400).json({
      error: 'Class ID is required and must be a string'
    });
  }
  
  if (dependentGroupIds && !Array.isArray(dependentGroupIds)) {
    return res.status(400).json({
      error: 'Dependent group IDs must be an array if provided'
    });
  }
  
  next();
};

// GET /api/groups - List groups with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const classId = req.query.classId as string;
    
    const groupRepository = AppDataSource.getRepository(Group);
    const queryBuilder = groupRepository.createQueryBuilder('group')
      .leftJoinAndSelect('group.class', 'class');
    
    // Apply filters
    if (classId) {
      queryBuilder.andWhere('group.classId = :classId', { classId });
    }
    
    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);
    
    const [groups, total] = await queryBuilder.getManyAndCount();
    
    res.json({
      groups,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({
      error: 'Internal server error while fetching groups'
    });
  }
});

// POST /api/groups - Create a new group
router.post('/', validateGroupData, async (req, res) => {
  try {
    const { name, classId, dependentGroupIds } = req.body;
    
    const groupRepository = AppDataSource.getRepository(Group);
    const classRepository = AppDataSource.getRepository(Class);
    
    // Verify class exists
    const classEntity = await classRepository.findOneBy({ id: classId });
    if (!classEntity) {
      return res.status(400).json({
        error: 'Class not found'
      });
    }
    
    // Validate dependent groups if provided
    if (dependentGroupIds && dependentGroupIds.length > 0) {
      for (const depGroupId of dependentGroupIds) {
        const depGroup = await groupRepository.findOneBy({ id: depGroupId });
        if (!depGroup) {
          return res.status(400).json({
            error: `Dependent group with ID '${depGroupId}' not found`
          });
        }
      }
    }
    
    // Create group
    const group = groupRepository.create({
      name: name.trim(),
      classId,
      dependentGroupIds: dependentGroupIds || []
    });
    
    await groupRepository.save(group);
    
    // Fetch the group with relations
    const savedGroup = await groupRepository.findOne({
      where: { id: group.id },
      relations: ['class']
    });
    
    res.status(201).json({
      group: savedGroup
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      error: 'Internal server error while creating group'
    });
  }
});

export { router as groupsRouter };