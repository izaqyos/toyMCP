// tests/db_init.test.js

// Mock dependencies first
const fs = require('fs');
jest.mock('fs');

const { Pool } = require('pg');
jest.mock('pg', () => {
    const mockQuery = jest.fn();
    const mockRelease = jest.fn();
    const mockConnect = jest.fn(() => Promise.resolve({ // Default successful connect
        query: mockQuery,
        release: mockRelease,
    }));
    const mockPool = {
        connect: mockConnect,
        query: jest.fn(),
        end: jest.fn(),
        _mocks: { mockQuery, mockRelease, mockConnect } // Store mocks for access
    };
    // Important: The mock needs to return the constructor function
    return { Pool: jest.fn(() => mockPool) };
});

// Now require the module under test *after* mocks are defined
const { initializeDatabase } = require('../../src/db');

// Helper to get the mocks (assuming Pool is constructed once implicitly)
const getPgMocks = () => {
    const poolInstance = new Pool(); // Creates/accesses the mocked instance
    return poolInstance._mocks;
};

// Define the actual schema content here or load dynamically if preferred
const ACTUAL_SCHEMA_SQL = `
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
`.trim(); // Use trim() to avoid leading/trailing whitespace issues

// Calculate expected statements based on the actual implementation
const EXPECTED_STATEMENTS = ACTUAL_SCHEMA_SQL.split(';')
    .map(s => s.trim()) // Trim whitespace from each potential statement
    .filter(s => s !== ''); // Filter out empty strings resulting from split

// The tests for initializeDatabase logic
describe('Database Initialization Logic (initializeDatabase)', () => {
    // const DEFAULT_SCHEMA_SQL = 'CREATE TABLE IF NOT EXISTS todos ();'; // No longer needed

    beforeEach(() => {
        // Reset mocks before each test
        const { mockQuery, mockRelease, mockConnect } = getPgMocks();
        mockQuery.mockClear().mockResolvedValue({ rows: [], rowCount: 0 }); // Default mock query success
        mockRelease.mockClear();
        mockConnect.mockClear().mockResolvedValue({ query: mockQuery, release: mockRelease }); // Default connect success
        // Mock readFileSync to return the actual schema content
        fs.readFileSync.mockClear().mockReturnValue(ACTUAL_SCHEMA_SQL); 
    });

     it('should succeed on the first attempt if connection and query work', async () => {
        const { mockConnect, mockQuery, mockRelease } = getPgMocks(); // Added mockRelease
        // No need to mock readFileSync here, beforeEach does it

        await initializeDatabase(3, 100);

        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(mockConnect).toHaveBeenCalledTimes(1);
        
        // Check that mockQuery was called for each statement
        expect(mockQuery).toHaveBeenCalledTimes(EXPECTED_STATEMENTS.length);
        
        // Check each call individually
        EXPECTED_STATEMENTS.forEach((statement, index) => {
            expect(mockQuery).toHaveBeenNthCalledWith(index + 1, statement);
        });

        // Check that release was called once after successful execution
        expect(mockRelease).toHaveBeenCalledTimes(1); 
    });

    it('should throw an error if reading the schema file fails', async () => {
        const readError = new Error('Failed to read file');
        fs.readFileSync.mockImplementation(() => {
            throw readError;
        });
        const { mockConnect } = getPgMocks();

        await expect(initializeDatabase(3, 100)).rejects.toThrow('Failed to read file');
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(mockConnect).not.toHaveBeenCalled();
    });

     it('should retry connecting and call release if pool.connect fails initially', async () => {
        const { mockConnect, mockQuery, mockRelease } = getPgMocks();
        const connectError = new Error('Connection failed');

        // Fail first connect, succeed second
        mockConnect
            .mockRejectedValueOnce(connectError)
            .mockResolvedValueOnce({ query: mockQuery, release: mockRelease });

        await initializeDatabase(3, 100);

        expect(mockConnect).toHaveBeenCalledTimes(2);
        expect(mockQuery).toHaveBeenCalledTimes(1); // Query called once on success
        expect(mockRelease).toHaveBeenCalledTimes(1); // Released on success
     });

    it('should retry query execution and call release if client.query fails initially', async () => {
        const { mockConnect } = getPgMocks(); // Only need connect mock here
        const queryError = new Error('Query failed');

        // Create specific mock clients for finer control
        // First client fails the *first* statement query, then resolves subsequent ones
        // Second client succeeds all statement queries
        const mockClientFailQueryFirst = { 
            query: jest.fn()
                .mockRejectedValueOnce(queryError) // Fail first statement
                .mockResolvedValue({}),           // Succeed subsequent statements
            release: jest.fn() 
        };
        const mockClientSuccess = { 
            query: jest.fn().mockResolvedValue({}), 
            release: jest.fn() 
        };
        
        // Fail query on first connect, succeed on second connect
        mockConnect
            .mockResolvedValueOnce(mockClientFailQueryFirst) // First connect gets client that fails first query
            .mockResolvedValueOnce(mockClientSuccess);       // Second connect gets client that succeeds all queries

        await initializeDatabase(3, 100); // Retries = 3

        // Connect should be called twice (initial attempt + 1 retry)
        expect(mockConnect).toHaveBeenCalledTimes(2); 
        
        // First client's query should be called once (failed on first statement)
        expect(mockClientFailQueryFirst.query).toHaveBeenCalledTimes(1); 
        expect(mockClientFailQueryFirst.query).toHaveBeenNthCalledWith(1, EXPECTED_STATEMENTS[0]);
        
        // First client should still be released because connect succeeded
        expect(mockClientFailQueryFirst.release).toHaveBeenCalledTimes(1); 

        // Second client's query should succeed for all statements
        expect(mockClientSuccess.query).toHaveBeenCalledTimes(EXPECTED_STATEMENTS.length); 
        EXPECTED_STATEMENTS.forEach((statement, index) => {
            expect(mockClientSuccess.query).toHaveBeenNthCalledWith(index + 1, statement);
        });
        
        // Second client should be released after success
        expect(mockClientSuccess.release).toHaveBeenCalledTimes(1); 
    });


    it('should throw an error after max retries if connection always fails', async () => {
        const { mockConnect, mockQuery, mockRelease } = getPgMocks();
        const connectError = new Error('Connection failed persistently');

        mockConnect.mockRejectedValue(connectError);

        const maxRetries = 3;
        await expect(initializeDatabase(maxRetries, 100)).rejects.toThrow(connectError);

        expect(mockConnect).toHaveBeenCalledTimes(maxRetries);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(mockRelease).not.toHaveBeenCalled(); // No client to release
    });

     it('should throw an error and call release after max retries if query always fails', async () => {
        const { mockConnect } = getPgMocks();
        const queryError = new Error('Query failed persistently');

        // Create a client mock where query *always* fails (e.g., on the first statement)
        const mockFailingClient = { 
            query: jest.fn().mockRejectedValue(queryError), // Always fail query
            release: jest.fn() 
        };
        mockConnect.mockResolvedValue(mockFailingClient); // Connect always succeeds

        const maxRetries = 3;
        await expect(initializeDatabase(maxRetries, 100)).rejects.toThrow(queryError);

        // Connect called once per attempt
        expect(mockConnect).toHaveBeenCalledTimes(maxRetries); 
        // Query called once per attempt (fails on first statement each time)
        expect(mockFailingClient.query).toHaveBeenCalledTimes(maxRetries); 
        // Release called once per attempt (because connect succeeded)
        expect(mockFailingClient.release).toHaveBeenCalledTimes(maxRetries); 
    });
}); 