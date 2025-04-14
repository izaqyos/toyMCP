#!/bin/bash

# This script performs a clean start of the toyMCP server and its database.
# 1. Stops existing containers and removes the database volume.
# 2. Starts a fresh database container.
# 3. Waits 5 seconds for the database to initialize.
# 4. Starts the Node.js server (which will initialize the DB schema).

echo "--- Performing Clean Docker Stop and Volume Removal ---"
docker compose down -v
if [ $? -ne 0 ]; then
  echo "Error during 'docker compose down -v'. Please check Docker."
  exit 1
fi

echo "--- Starting Fresh Database Container ---"
docker compose up -d db
if [ $? -ne 0 ]; then
  echo "Error during 'docker compose up -d db'. Please check Docker."
  exit 1
fi

echo "--- Waiting 5 seconds for DB to initialize... ---"
sleep 5

echo "--- Starting Node.js Server (npm start) ---"
# This command will run in the foreground. Press Ctrl+C to stop the server.
npm start

# Check exit status of npm start (optional, might not be reached if Ctrl+C is used)
if [ $? -ne 0 ]; then
  echo "Server exited with an error."
  exit 1
fi

echo "--- Server stopped ---"
exit 0 