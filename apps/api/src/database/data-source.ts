import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';

// CLI scripts run outside the Nest container, so ConfigModule never loads .env.
loadEnv({ path: join(__dirname, '..', '..', '.env') });

/**
 * Entry point for the TypeORM CLI (`npm run migration:*` in apps/api).
 * The running app builds its options from ConfigService instead — see AppModule.
 */
export const AppDataSource = new DataSource(
  buildDataSourceOptions({ get: (key) => process.env[key] }),
);

export default AppDataSource;
