require('dotenv').config(); // Load .env file variables into process.env

const config = {
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'todos_db',
        user: process.env.DB_USER || 'todos_user',
        password: process.env.DB_PASSWORD || 'todos_password',
    },
    server: {
        port: parseInt(process.env.PORT || '3000', 10)
    }
};

module.exports = config; 