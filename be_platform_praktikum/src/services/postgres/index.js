const { Pool } = require('pg');
require('dotenv').config();

function getSslConfig() {
  const pgssl = (process.env.PGSSL || '').toLowerCase().trim();
  if (pgssl === 'true') {
    return { rejectUnauthorized: false };
  }
  if (pgssl === 'false') {
    return false;
  }
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.PGHOST &&
    process.env.PGHOST !== 'localhost' &&
    process.env.PGHOST !== '127.0.0.1'
  ) {
    return { rejectUnauthorized: false };
  }
  return false;
}

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: getSslConfig(),
});

module.exports = pool;
