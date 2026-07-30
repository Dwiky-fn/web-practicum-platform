const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

const isInternal = connectionString && connectionString.includes('railway.internal');
const isProduction = process.env.NODE_ENV === 'production';
const ssl = (isProduction && !isInternal && connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'))
  ? { rejectUnauthorized: false }
  : false;

const pool = connectionString
  ? new Pool({ connectionString, ssl })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '',
      database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'platform_praktikum',
      ssl: (isProduction && process.env.PGHOST && !process.env.PGHOST.includes('localhost') && !process.env.PGHOST.includes('railway.internal'))
        ? { rejectUnauthorized: false }
        : false,
    });

module.exports = pool;
