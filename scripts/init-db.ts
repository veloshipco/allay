import 'reflect-metadata'

import { AppDataSource } from '../lib/database/config'

async function initializeDatabase() {
  try {
    console.log('Initializing database...')
    
    // Initialize the data source
    await AppDataSource.initialize()
    console.log('Database connection established')
    
    // Synchronize the schema (create tables)
    await AppDataSource.synchronize()
    console.log('Database schema synchronized')
    
    console.log('Database initialization complete!')
    
  } catch (error) {
    console.error('Database initialization failed:', error)
  } finally {
    // Close the connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy()
    }
    process.exit()
  }
}

initializeDatabase() 