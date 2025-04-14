const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const pool = new Pool(config.db);

// Function to wait for a specified duration
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to initialize the database schema with retries
async function initializeDatabase(maxRetries = 5, retryDelay = 3000) {
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schemaSQL;
    try {
        schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    } catch (readErr) {
        console.error(`Failed to read schema file at ${schemaPath}:`, readErr);
        throw readErr; // Cannot proceed without schema
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let client;
        try {
            console.log(`Attempt ${attempt}/${maxRetries}: Connecting to database...`);
            client = await pool.connect();
            console.log(`Attempt ${attempt}/${maxRetries}: Database connected. Executing schema...`);
            await client.query(schemaSQL); // Execute CREATE TABLE IF NOT EXISTS...
            console.log(`Attempt ${attempt}/${maxRetries}: Database schema initialized successfully.`);
            client.release();
            return; // Success, exit the function
        } catch (err) {
            console.error(`Attempt ${attempt}/${maxRetries}: Error during DB initialization:`, err.message);
            if (client) {
                client.release(); // Ensure client is released on error
            }
            if (attempt === maxRetries) {
                console.error('Max retries reached. Failed to initialize database.');
                throw err; // Throw the last error after max retries
            }
            console.log(`Waiting ${retryDelay / 1000} seconds before next attempt...`);
            await delay(retryDelay);
        }
    }
}

// Export the pool for querying and the initialization function
module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
    initializeDatabase,
}; 