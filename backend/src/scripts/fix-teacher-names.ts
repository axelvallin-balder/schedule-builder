import { Client } from 'pg'

async function fixTeacherData() {
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
    
    // Check current teacher data
    const result = await client.query(`SELECT id, name, email FROM teachers`)
    console.log('Current teachers:', result.rows)
    
    // Fix any teachers with null names
    const teachersWithNullNames = result.rows.filter(t => !t.name || t.name.trim() === '')
    
    for (let i = 0; i < teachersWithNullNames.length; i++) {
      const teacher = teachersWithNullNames[i]
      const newName = `Teacher ${i + 1}`
      
      await client.query(`UPDATE teachers SET name = $1 WHERE id = $2`, [newName, teacher.id])
      console.log(`Updated teacher ${teacher.id} with name: ${newName}`)
    }
    
    console.log('Teacher data fixed successfully')
    
  } catch (error) {
    console.error('Failed to fix teacher data:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

fixTeacherData()