import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'digital_identity_db',
  password: 'Beinstein@123',
  port: 5432,
});

export default pool;
