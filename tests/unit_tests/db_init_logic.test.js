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

// The tests for initializeDatabase logic
describe('Database Initialization Logic (initializeDatabase)', () => {
    const DEFAULT_SCHEMA_SQL = 'CREATE TABLE IF NOT EXISTS todos ();'; // Simplified

    beforeEach(() => {
        // Reset mocks before each test
        const { mockQuery, mockRelease, mockConnect } = getPgMocks();
        mockQuery.mockClear().mockResolvedValue({ rows: [], rowCount: 0 }); // Default mock query success
        mockRelease.mockClear();
        mockConnect.mockClear().mockResolvedValue({ query: mockQuery, release: mockRelease }); // Default connect success
        fs.readFileSync.mockClear().mockReturnValue(DEFAULT_SCHEMA_SQL); // Default read success
    });

     it('should succeed on the first attempt if connection and query work', async () => {
        const { mockConnect, mockQuery } = getPgMocks();
        fs.readFileSync.mockReturnValue(DEFAULT_SCHEMA_SQL);

        await initializeDatabase(3, 100);

        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(mockConnect).toHaveBeenCalledTimes(1);
        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery).toHaveBeenCalledWith(DEFAULT_SCHEMA_SQL);
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
        const mockClientSuccess = { query: jest.fn().mockResolvedValue({}), release: jest.fn() }; 
        const mockClientFailQuery = { query: jest.fn().mockRejectedValueOnce(queryError), release: jest.fn() };
        
        // Fail query on first connect, succeed on second connect
        mockConnect
            .mockResolvedValueOnce(mockClientFailQuery) // First connect gets client that fails query
            .mockResolvedValueOnce(mockClientSuccess);   // Second connect gets client that succeeds

        await initializeDatabase(3, 100);

        expect(mockConnect).toHaveBeenCalledTimes(2); // Connect called twice
        expect(mockClientFailQuery.query).toHaveBeenCalledTimes(1); // First client query failed
        expect(mockClientFailQuery.release).toHaveBeenCalledTimes(1); // First client released (in catch block)
        expect(mockClientSuccess.query).toHaveBeenCalledTimes(1); // Second client query succeeded
        expect(mockClientSuccess.release).toHaveBeenCalledTimes(1); // Second client released (after success)
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

        // Always succeed connect, but make query always fail
        const mockFailingClient = { query: jest.fn().mockRejectedValue(queryError), release: jest.fn() };
        mockConnect.mockResolvedValue(mockFailingClient);

        const maxRetries = 3;
        await expect(initializeDatabase(maxRetries, 100)).rejects.toThrow(queryError);

        expect(mockConnect).toHaveBeenCalledTimes(maxRetries);
        expect(mockFailingClient.query).toHaveBeenCalledTimes(maxRetries);
        expect(mockFailingClient.release).toHaveBeenCalledTimes(maxRetries); // Released each time in catch block
    });
}); 