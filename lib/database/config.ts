import { DataSource } from 'typeorm'
import { Tenant } from './entities/Tenant'
import { Conversation } from './entities/Conversation'
import { User } from './entities/User'
import { Session } from './entities/Session'
import { SlackUser } from './entities/SlackUser'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'postgres',
  ssl: process.env.DATABASE_HOST?.includes('supabase.co') ? { rejectUnauthorized: false } : false,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [Tenant, Conversation, User, Session, SlackUser],
  migrations: ['lib/database/migrations/*.ts'],
  subscribers: ['lib/database/subscribers/*.ts']
})

let isInitialized = false

export const initializeDatabase = async () => {
  if (!isInitialized) {
    await AppDataSource.initialize()
    isInitialized = true
  }
  return AppDataSource
} 