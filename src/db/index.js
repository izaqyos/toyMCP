const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const pool = new Pool(config.db);

// Function to initialize the database schema
async function initializeDatabase() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    const client = await pool.connect();
    try {
        console.log('Initializing database schema...');
        await client.query(schemaSQL);
        console.log('Database schema initialized successfully.');
    } catch (err) {
        console.error('Error initializing database schema:', err);
        throw err; // Re-throw the error to indicate failure
    } finally {
        client.release();
    }
}

// Export the pool for querying and the initialization function
module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    initializeDatabase,
}; 