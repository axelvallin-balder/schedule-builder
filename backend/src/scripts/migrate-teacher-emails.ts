import { AppDataSource } from '../data-source'

async function migrateTeacherEmails() {
  try {
    await AppDataSource.initialize()
    
    // First, update the email column to allow nulls temporarily
    await AppDataSource.query(`ALTER TABLE teachers ALTER COLUMN email DROP NOT NULL`)
    
    // Add unique constraint temporarily removed
    await AppDataSource.query(`ALTER TABLE teachers DROP CONSTRAINT IF EXISTS UQ_teachers_email`)
    
    // Get all teachers without emails
    const teachers = await AppDataSource.query(`
      SELECT id, name FROM teachers WHERE email IS NULL OR email = ''
    `)
    
    console.log(`Found ${teachers.length} teachers without emails`)
    
    // Generate email addresses for teachers without them
    for (let i = 0; i < teachers.length; i++) {
      const teacher = teachers[i]
      // Generate email from name + index to ensure uniqueness
      const emailName = teacher.name.toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove special characters
        .substring(0, 20) // Limit length
      
      const email = `${emailName}${i + 1}@school.edu`
      
      await AppDataSource.query(`
        UPDATE teachers 
        SET email = $1 
        WHERE id = $2
      `, [email, teacher.id])
      
      console.log(`Updated teacher ${teacher.name} with email: ${email}`)
    }
    
    // Update availability for teachers that don't have it
    const teachersWithoutAvailability = await AppDataSource.query(`
      SELECT id, name FROM teachers 
      WHERE availability IS NULL OR availability = '[]'::jsonb
    `)
    
    console.log(`Found ${teachersWithoutAvailability.length} teachers without availability`)
    
    const defaultAvailability = JSON.stringify([
      { dayOfWeek: 1, startTime: '08:15', endTime: '16:00' }, // Monday
      { dayOfWeek: 2, startTime: '08:15', endTime: '16:00' }, // Tuesday
      { dayOfWeek: 3, startTime: '08:15', endTime: '16:00' }, // Wednesday
      { dayOfWeek: 4, startTime: '08:15', endTime: '16:00' }, // Thursday
      { dayOfWeek: 5, startTime: '08:15', endTime: '16:00' }, // Friday
    ])
    
    for (const teacher of teachersWithoutAvailability) {
      await AppDataSource.query(`
        UPDATE teachers 
        SET availability = $1::jsonb
        WHERE id = $2
      `, [defaultAvailability, teacher.id])
      
      console.log(`Updated availability for teacher: ${teacher.name}`)
    }
    
    // Now make email required and unique again
    await AppDataSource.query(`ALTER TABLE teachers ALTER COLUMN email SET NOT NULL`)
    await AppDataSource.query(`ALTER TABLE teachers ADD CONSTRAINT UQ_teachers_email UNIQUE (email)`)
    
    console.log('Migration completed successfully')
    await AppDataSource.destroy()
  } catch (error) {
    console.error('Migration failed:', error)
    await AppDataSource.destroy()
    process.exit(1)
  }
}

migrateTeacherEmails()