const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const pool = new Pool(config.db);

// Function to wait for a specified duration
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to read and execute the schema file
async function initializeDatabase(retries = 5, delay = 3000) {
    const schemaPath = path.join(__dirname, 'schema.sql');
    try {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        // Split schema into individual statements (simple split, might need refinement for complex SQL)
        const statements = schemaSql.split(';').filter(s => s.trim() !== '');

        // Attempt to connect and execute schema
        for (let i = 0; i < retries; i++) {
            try {
                const client = await pool.connect();
                console.log('Connected to database. Initializing schema...');
                // Execute each statement individually
                for (const statement of statements) {
                    await client.query(statement); 
                }
                client.release();
                console.log('Database schema initialized (or already exists) successfully.');
                return; // Success, exit the function
            } catch (err) {
                console.error(`Attempt ${i + 1} failed: Could not connect or initialize schema.`, err.message);
                if (i === retries - 1) {
                    console.error('Max retries reached. Database initialization failed.');
                    throw err; // Rethrow the last error if max retries reached
                }
                console.log(`Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    } catch (err) {
        console.error('Failed to read schema file:', err);
        throw err; // Rethrow error if file reading fails
    }
}

// Export the pool, query function, and initialization function
module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    initializeDatabase
}; 