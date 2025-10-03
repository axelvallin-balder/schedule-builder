import { Client } from 'pg'

async function recreateTeachersTable() {
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
    
    // Drop and recreate the teachers table
    await client.query(`DROP TABLE IF EXISTS teachers CASCADE`)
    console.log('Dropped teachers table')
    
    await client.query(`
      CREATE TABLE teachers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        "subjectIds" text NOT NULL DEFAULT '',
        availability JSONB NOT NULL DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `)
    console.log('Created new teachers table')
    
    // Insert a sample teacher with the new structure
    const defaultAvailability = JSON.stringify([
      { dayOfWeek: 1, startTime: '08:15', endTime: '16:00' }, // Monday
      { dayOfWeek: 2, startTime: '08:15', endTime: '16:00' }, // Tuesday
      { dayOfWeek: 3, startTime: '08:15', endTime: '16:00' }, // Wednesday
      { dayOfWeek: 4, startTime: '08:15', endTime: '16:00' }, // Thursday
      { dayOfWeek: 5, startTime: '08:15', endTime: '16:00' }, // Friday
    ])
    
    await client.query(`
      INSERT INTO teachers (name, email, availability)
      VALUES ($1, $2, $3::jsonb)
    `, ['Sample Teacher', 'teacher@school.edu', defaultAvailability])
    
    console.log('Added sample teacher')
    console.log('Teachers table recreated successfully')
    
  } catch (error) {
    console.error('Failed to recreate teachers table:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

recreateTeachersTable()