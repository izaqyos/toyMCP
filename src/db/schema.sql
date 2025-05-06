DROP TABLE IF EXISTS todos CASCADE;
DROP TABLE IF EXISTS users CASCADE; -- Add cascade if needed

-- Create the users table first if todos might reference it later (e.g., user_id foreign key)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL, -- Store hashed passwords
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the todos table
CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT false, -- Added completed field
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    -- Optional: Add a user_id foreign key if todos are user-specific
    -- user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- Optional: Add indexes for performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
-- CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id); 