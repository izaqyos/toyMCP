require('dotenv').config(); // Load .env file variables into process.env

const DEFAULT_DEV_JWT_SECRET = 'YourSuperSecretKeyForDevelopment';

const config = {
    env: process.env.NODE_ENV || 'development',
    server: {
        port: process.env.PORT || 3000,
    },
    db: {
        user: process.env.DB_USER || 'todos_user',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'todos_db',
        password: process.env.DB_PASSWORD || 'todos_password',
        port: parseInt(process.env.DB_PORT || '5432', 10),
    },
    auth: {
        jwtSecret: process.env.JWT_SECRET || DEFAULT_DEV_JWT_SECRET,
        tokenExpiresIn: '1h' // Example token expiration
    }
};

// Add warning if using default secret in production
if (config.auth.jwtSecret === DEFAULT_DEV_JWT_SECRET && config.env === 'production') {
    console.warn('\n*** WARNING: Using default development JWT secret in production! ***');
    console.warn('*** Set the JWT_SECRET environment variable for security.    ***\n');
}

module.exports = config; 