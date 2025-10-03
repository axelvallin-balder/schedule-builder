import { Client } from 'pg'

async function migrateTeacherEmails() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'schedule_builder'
  })

  try {
    await client.connect()
    console.log('Connected to database')
    
    // Step 1: Add email column as nullable
    try {
      await client.query(`ALTER TABLE teachers ADD COLUMN email VARCHAR(255)`)
      console.log('Added email column')
    } catch (error: any) {
      if (error.code === '42701') {
        console.log('Email column already exists')
      } else {
        throw error
      }
    }
    
    // Step 2: Get all teachers without emails
    const result = await client.query(`
      SELECT id, name FROM teachers WHERE email IS NULL OR email = ''
    `)
    
    console.log(`Found ${result.rows.length} teachers without emails`)
    
    // Step 3: Generate email addresses for teachers without them
    for (let i = 0; i < result.rows.length; i++) {
      const teacher = result.rows[i]
      // Generate email from name + index to ensure uniqueness
      const emailName = teacher.name.toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove special characters
        .substring(0, 20) // Limit length
      
      const email = `${emailName}${i + 1}@school.edu`
      
      await client.query(`
        UPDATE teachers 
        SET email = $1 
        WHERE id = $2
      `, [email, teacher.id])
      
      console.log(`Updated teacher ${teacher.name} with email: ${email}`)
    }
    
    // Step 4: Add availability column as jsonb if it doesn't exist
    try {
      await client.query(`ALTER TABLE teachers ADD COLUMN availability JSONB DEFAULT '[]'::jsonb`)
      console.log('Added availability column')
    } catch (error: any) {
      if (error.code === '42701') {
        console.log('Availability column already exists')
      } else {
        throw error
      }
    }
    
    // Step 5: Update availability for teachers that don't have it
    const availabilityResult = await client.query(`
      SELECT id, name FROM teachers 
      WHERE availability IS NULL OR availability = '[]'::jsonb
    `)
    
    console.log(`Found ${availabilityResult.rows.length} teachers without availability`)
    
    const defaultAvailability = JSON.stringify([
      { dayOfWeek: 1, startTime: '08:15', endTime: '16:00' }, // Monday
      { dayOfWeek: 2, startTime: '08:15', endTime: '16:00' }, // Tuesday
      { dayOfWeek: 3, startTime: '08:15', endTime: '16:00' }, // Wednesday
      { dayOfWeek: 4, startTime: '08:15', endTime: '16:00' }, // Thursday
      { dayOfWeek: 5, startTime: '08:15', endTime: '16:00' }, // Friday
    ])
    
    for (const teacher of availabilityResult.rows) {
      await client.query(`
        UPDATE teachers 
        SET availability = $1::jsonb
        WHERE id = $2
      `, [defaultAvailability, teacher.id])
      
      console.log(`Updated availability for teacher: ${teacher.name}`)
    }
    
    // Step 6: Make email required and unique
    await client.query(`ALTER TABLE teachers ALTER COLUMN email SET NOT NULL`)
    console.log('Made email column NOT NULL')
    
    try {
      await client.query(`ALTER TABLE teachers ADD CONSTRAINT UQ_teachers_email UNIQUE (email)`)
      console.log('Added unique constraint to email')
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('Unique constraint already exists')
      } else {
        throw error
      }
    }
    
    console.log('Migration completed successfully')
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

migrateTeacherEmails()