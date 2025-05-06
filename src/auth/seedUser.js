const bcrypt = require('bcrypt');
const db = require('../db');

// Configuration for the default user
// IMPORTANT: In a real application, use environment variables for username/password
const DEFAULT_USERNAME = 'testuser';
const DEFAULT_PASSWORD = 'password123'; // Choose a default password
const SALT_ROUNDS = 10; // Standard salt rounds for bcrypt

/**
 * Checks if the default user exists, and creates them if not.
 * Hashes the password using bcrypt.
 */
async function seedDefaultUser() {
    console.log(`Checking for default user '${DEFAULT_USERNAME}'...`);
    try {
        // Check if user exists
        const userCheck = await db.query('SELECT id FROM users WHERE username = $1', [DEFAULT_USERNAME]);

        if (userCheck.rows.length === 0) {
            console.log(`Default user '${DEFAULT_USERNAME}' not found. Creating...`);
            // Hash the password
            const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

            // Insert the user
            await db.query(
                'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
                [DEFAULT_USERNAME, hashedPassword]
            );
            console.log(`Default user '${DEFAULT_USERNAME}' created successfully.`);
        } else {
            console.log(`Default user '${DEFAULT_USERNAME}' already exists.`);
        }
    } catch (err) {
        console.error('Error during default user seeding:', err);
        // Depending on requirements, you might want to throw the error or exit
        // For simplicity here, we log the error and continue
    }
}

module.exports = seedDefaultUser; 