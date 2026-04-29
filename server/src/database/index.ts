import { DataSource } from 'typeorm';
import {
  UserEntity,
  ChatSessionEntity,
  ModerationLogEntity,
  PaymentEntity,
  ReportEntity,
} from '../models/entities.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [
    UserEntity,
    ChatSessionEntity,
    ModerationLogEntity,
    PaymentEntity,
    ReportEntity,
  ],
  migrations: ['./src/database/migrations/*.ts'],
  subscribers: ['./src/database/subscribers/*.ts'],
});

export async function initializeDatabase() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connection established');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export async function closeDatabase() {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Database connection closed');
  }
}
