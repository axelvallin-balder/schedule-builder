import express from 'express';
import { AppDataSource } from '../../data-source';
import { Group } from '../../models/Group';
import { Class } from '../../models/Class';
// Allow creating groups without classIds
const router = express.Router();

// Validation middleware
const validateGroupData = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { name, classIds, dependentGroupIds, size, academicLevel } = req.body;
  
  // Required fields validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      error: 'Group name is required and must be a non-empty string'
    });
  }
  
  if (classIds !== undefined && !Array.isArray(classIds)) {
    return res.status(400).json({
      error: 'Class IDs must be an array if provided'
    });
  }
  
  if (dependentGroupIds && !Array.isArray(dependentGroupIds)) {
    return res.status(400).json({
      error: 'Dependent group IDs must be an array if provided'
    });
  }
  
  if (size !== undefined && (typeof size !== 'number' || size < 0)) {
    return res.status(400).json({
      error: 'Size must be a positive number if provided'
    });
  }
  
  if (academicLevel !== undefined && typeof academicLevel !== 'string') {
    return res.status(400).json({
      error: 'Academic level must be a string if provided'
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
    const search = req.query.search as string;
    
    const groupRepository = AppDataSource.getRepository(Group);
    const queryBuilder = groupRepository.createQueryBuilder('group')
      .leftJoinAndSelect('group.classes', 'classes');
    
    // Apply filters
    if (classId) {
      queryBuilder.andWhere('classes.id = :classId', { classId });
    }
    
    if (search) {
      queryBuilder.andWhere('group.name ILIKE :search', { search: `%${search}%` });
    }
    
    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);
    
    const [groups, total] = await queryBuilder.getManyAndCount();
    
    res.json({
      data: groups,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
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
    const { name, classIds, dependentGroupIds, size, academicLevel } = req.body;
    
    const groupRepository = AppDataSource.getRepository(Group);
    const classRepository = AppDataSource.getRepository(Class);
    
    let classes: Class[] = [];
    
    // Verify all classes exist if classIds are provided
    if (classIds && classIds.length > 0) {
      classes = await classRepository.findByIds(classIds);
      if (classes.length !== classIds.length) {
        return res.status(400).json({
          error: 'One or more classes not found'
        });
      }
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
      classIds: classIds || [],
      dependentGroupIds: dependentGroupIds || [],
      size,
      academicLevel
    });
    
    await groupRepository.save(group);
    
    // Set many-to-many relationships if classes exist
    if (classes.length > 0) {
      group.classes = classes;
      await groupRepository.save(group);
    }
    
    // Fetch the group with relations
    const savedGroup = await groupRepository.findOne({
      where: { id: group.id },
      relations: ['classes']
    });
    
    res.status(201).json({
      data: savedGroup,
      message: 'Group created successfully'
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      error: 'Internal server error while creating group'
    });
  }
});

// PUT /api/groups/:id - Update a group
router.put('/:id', validateGroupData, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, classIds, dependentGroupIds, size, academicLevel } = req.body;
    
    const groupRepository = AppDataSource.getRepository(Group);
    const classRepository = AppDataSource.getRepository(Class);
    
    // Check if group exists
    const group = await groupRepository.findOne({
      where: { id },
      relations: ['classes']
    });
    
    if (!group) {
      return res.status(404).json({
        error: 'Group not found'
      });
    }
    
    // Verify all classes exist if classIds are provided
    let classes: Class[] = [];
    if (classIds && classIds.length > 0) {
      classes = await classRepository.findByIds(classIds);
      if (classes.length !== classIds.length) {
        return res.status(400).json({
          error: 'One or more classes not found'
        });
      }
    }
    
    // Validate dependent groups if provided
    if (dependentGroupIds && dependentGroupIds.length > 0) {
      for (const depGroupId of dependentGroupIds) {
        if (depGroupId === id) continue; // Skip self-reference
        const depGroup = await groupRepository.findOneBy({ id: depGroupId });
        if (!depGroup) {
          return res.status(400).json({
            error: `Dependent group with ID '${depGroupId}' not found`
          });
        }
      }
    }
    
    // Update group
    group.name = name.trim();
    group.classIds = classIds || [];
    group.dependentGroupIds = dependentGroupIds || [];
    group.size = size;
    group.academicLevel = academicLevel;
    group.classes = classes;
    
    await groupRepository.save(group);
    
    // Fetch the updated group with relations
    const updatedGroup = await groupRepository.findOne({
      where: { id },
      relations: ['classes']
    });
    
    res.json({
      data: updatedGroup,
      message: 'Group updated successfully'
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({
      error: 'Internal server error while updating group'
    });
  }
});

// DELETE /api/groups/:id - Delete a group
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const groupRepository = AppDataSource.getRepository(Group);
    
    const group = await groupRepository.findOneBy({ id });
    if (!group) {
      return res.status(404).json({
        error: 'Group not found'
      });
    }
    
    await groupRepository.remove(group);
    
    res.json({
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      error: 'Internal server error while deleting group'
    });
  }
});

export { router as groupsRouter };