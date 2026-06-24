const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbPassword = process.argv[2];

if (!dbPassword) {
  console.error('Error: Please provide your Supabase database password as an argument.');
  console.error('Example: node scratch/apply-migration.js "your-db-password"');
  process.exit(1);
}

const config = {
  host: 'db.lzvbqfddszeqrklgbeyc.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: dbPassword,
  ssl: {
    rejectUnauthorized: false
  }
};

async function main() {
  console.log('Connecting to remote Supabase database...');
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('Connected successfully!');

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '025_crm_contacts_and_whatsapp.sql');
    console.log(`Reading migration script from: ${migrationPath}`);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL queries...');
    await client.query(sql);
    console.log('Success: CRM database migration applied successfully!');

  } catch (err) {
    console.error('Migration failed!');
    console.error(err);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
