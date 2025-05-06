#!/bin/bash

# Bash script to sequentially test the toyMCP To-Do Server using HTTPie
# Uses piped JSON, checks responses with jq, and reports results.
#
# IMPORTANT: This script assumes the database is in a clean state (empty todos table)
#            when it starts, so that the first added item gets ID 1 and the second ID 2.
#            If the DB contains previous data, the remove steps [4] and [5] will likely fail.
#            To ensure a clean state, run: `docker compose down -v && docker compose up -d db`
#            before starting the server (`npm start`) and running this script.
#
# Requires: httpie, jq
#
# Assumes the server is running on http://127.0.0.1:3000
# Run this script using: bash test_server.sh

# --- Configuration ---
# BASE_URL="http://127.0.0.1:3000/rpc" # Base for API calls
API_BASE_URL="http://127.0.0.1:3000" # Base for all server URLs
RPC_ENDPOINT="$API_BASE_URL/rpc"
AUTH_ENDPOINT="$API_BASE_URL/auth/login"
HEADERS="Content-Type:application/json"
AUTH_TOKEN=""
PASSED_COUNT=0
FAILED_COUNT=0
TOTAL_TESTS=0

# --- Login Function ---
# Logs in the default user and exports the token
login_user() {
    echo -e "\n--- [0] Attempting Login ---"
    local login_payload='{"username": "testuser", "password": "password123"}'
    local login_response

    login_response=$(curl -s -X POST -H "$HEADERS" -d "$login_payload" "$AUTH_ENDPOINT")
    local login_curl_code=$?

    if [ $login_curl_code -ne 0 ]; then
        echo "FAILED: Login request failed with exit code $login_curl_code"
        echo "Response: $login_response"
        exit 1 # Cannot proceed without login
    fi

    # Check if login response contains a token using jq
    AUTH_TOKEN=$(echo "$login_response" | jq -r '.token // empty') # Extract token or empty string

    if [ -z "$AUTH_TOKEN" ]; then
        echo "FAILED: Login failed. Could not extract token from response."
        echo "Response:"
        echo "$login_response" | jq '.'
        exit 1 # Cannot proceed without token
    else
        echo "SUCCESS: Login successful. Token obtained."
        # Optionally print token: echo "Token: $AUTH_TOKEN"
    fi
}

# --- Helper Function ---
# Runs a test case
# $1: Test number/ID (e.g., "[1]", "[E1]")
# $2: Test description
# $3: JSON payload to send (as a string)
# $4: jq expression to check for success (should evaluate to true on success)
# $5: Expected description (optional, for clarity in failure message)
run_test() {
    local test_id="$1"
    local description="$2"
    local payload="$3"
    local jq_check="$4"
    local expected_desc="$5"
    local response
    local jq_exit_code
    local auth_header

    echo -e "\n--- $test_id $description ---"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Add Authorization header if token exists
    if [ -n "$AUTH_TOKEN" ]; then
        auth_header="Authorization: Bearer $AUTH_TOKEN"
        # Execute curl command piping payload and using --data-binary @-
        response=$(echo "$payload" | curl -s -X POST -H "$HEADERS" -H "$auth_header" --data-binary @- "$RPC_ENDPOINT")
    else 
        # Run without auth header for specific tests like E6, E7 or initial auth checks
        # Check if endpoint is AUTH or RPC
        local target_endpoint=$RPC_ENDPOINT
        # Special handling for tests targeting login endpoint or raw calls
        if [[ "$test_id" == "[L1]" || "$test_id" == "[L2]" ]]; then
             target_endpoint=$AUTH_ENDPOINT
             response=$(curl -s -X POST -H "$HEADERS" -d "$payload" "$target_endpoint") # Send payload directly
        elif [[ "$test_id" == "[E8]" || "$test_id" == "[E9]" ]]; then 
            target_endpoint=$RPC_ENDPOINT
             # These tests explicitly check unauthenticated access
             response=$(echo "$payload" | curl -s -X POST -H "$HEADERS" --data-binary @- "$target_endpoint") 
        else
            # Default: assume RPC endpoint if no token (should likely fail but let test check)
             response=$(echo "$payload" | curl -s -X POST -H "$HEADERS" --data-binary @- "$target_endpoint") 
        fi
    fi
    local curl_exit_code=$?

    if [ $curl_exit_code -ne 0 ]; then
        echo "FAILED: HTTP request failed with exit code $curl_exit_code"
        echo "Response:"
        echo "$response" # Show response even on HTTP failure
        FAILED_COUNT=$((FAILED_COUNT + 1))
        return
    fi

    # Check the response with jq
    # Special case for 401 checks
    if [[ "$jq_check" == "expect_401" ]]; then
        local http_code=$(echo "$response" | jq -r '.statusCode // empty') # Check if server returns JSON error for 401
        # If passport fails auth, it often returns plain text "Unauthorized"
        # We need to check the raw response or rely on curl's code if server doesn't format 401 as JSON
        # Let's rely on the fact that jq will fail for non-JSON, which is expected for default 401
        echo "$response" | jq -e '.' > /dev/null 2>&1
        local is_json=$?
        if [[ $is_json -ne 0 && "$response" == "Unauthorized" ]]; then # Check for plain text 401
             echo "SUCCESS (Got non-JSON 'Unauthorized' as expected for 401)"
             PASSED_COUNT=$((PASSED_COUNT + 1))
        else
            echo "FAILED: Expected 401 Unauthorized (non-JSON or specific text), got:"
            echo "$response" | jq '.' # Attempt to pretty print if JSON
            FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
        return
    fi

    # Standard jq check
    echo "$response" | jq -e "$jq_check" > /dev/null 2>&1
    jq_exit_code=$?

    if [ $jq_exit_code -eq 0 ]; then
        echo "SUCCESS"
        echo "Response:"
        echo "$response" | jq '.' # Pretty print JSON response on success
        PASSED_COUNT=$((PASSED_COUNT + 1))
    else
        echo "FAILED: Response JSON did not match expected criteria."
        if [ -n "$expected_desc" ]; then
            echo "       Expected: $expected_desc"
        fi
        echo "Response:"
        echo "$response" | jq '.' # Pretty print JSON response on failure
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
}

# --- Login Step ---
login_user # Call login function to get the token

# --- Test Execution ---

# [1] Add 'Learn HTTPie' (Now requires auth)
payload_1='{"jsonrpc": "2.0", "method": "todo.add", "params": {"text": "Learn HTTPie"}, "id": 1}'
check_1='.error == null and .result.text == "Learn HTTPie"'
run_test "[1]" "Add 'Learn HTTPie' (Requires Auth)" "$payload_1" "$check_1" "'result' with correct text, no 'error'"

# [2] Add 'Test the server'
payload_2='{"jsonrpc": "2.0", "method": "todo.add", "params": {"text": "Test the server"}, "id": 2}'
check_2='.error == null and .result.text == "Test the server"'
run_test "[2]" "Add 'Test the server' (Expected ID: 2 if DB is clean)" "$payload_2" "$check_2" "'result' with correct text, no 'error'"

# [3] List all items
payload_3='{"jsonrpc": "2.0", "method": "todo.list", "id": 3}'
check_3='.error == null and (.result | length) >= 2' # Check at least 2 items if clean, just check for result array
run_test "[3]" "List all items (Should show items just added)" "$payload_3" "$check_3" "'result' is an array, no 'error'"

# [4] Remove the first item
payload_4='{"jsonrpc": "2.0", "method": "todo.remove", "params": {"id": 1}, "id": 4}'
check_4='.error == null and .result.id == 1'
run_test "[4]" "Remove the first item (Assumes ID 1 - requires clean DB start)" "$payload_4" "$check_4" "'result' with ID 1, no 'error'"

# [5] Remove the second item
payload_5='{"jsonrpc": "2.0", "method": "todo.remove", "params": {"id": 2}, "id": 5}'
check_5='.error == null and .result.id == 2'
run_test "[5]" "Remove the second item (Assumes ID 2 - requires clean DB start)" "$payload_5" "$check_5" "'result' with ID 2, no 'error'"

# [6] List items again
payload_6='{"jsonrpc": "2.0", "method": "todo.list", "id": 6}'
check_6='.error == null and (.result | length) == 0' # Expect empty array if remove worked
run_test "[6]" "List items again (Should be empty if DB started clean)" "$payload_6" "$check_6" "'result' is an empty array, no 'error'"

# [7] Call mcp.discover (Now requires auth)
payload_7='{"jsonrpc": "2.0", "method": "mcp.discover", "id": 7}'
check_7='.error == null and .result.name == "ToyMCP Todo Service" and (.result.methods | map(.name) | contains(["todo.list", "todo.add", "todo.remove", "mcp.discover"]))'
run_test "[7]" "Call mcp.discover (Requires Auth)" "$payload_7" "$check_7" "'result' with service info and all methods listed"

echo -e "\n--- Error Cases ---"

# [E1] Add item with missing 'text' parameter (Requires Auth)
payload_e1='{"jsonrpc": "2.0", "method": "todo.add", "params": {}, "id": 101}'
check_e1='.error.code == -32602'
run_test "[E1]" "Add item with missing 'text' parameter (Requires Auth)" "$payload_e1" "$check_e1" "'error' with code -32602"

# [E2] Add item with invalid 'text' type
payload_e2='{"jsonrpc": "2.0", "method": "todo.add", "params": {"text": 123}, "id": 102}'
check_e2='.error.code == -32602'
run_test "[E2]" "Add item with invalid 'text' type" "$payload_e2" "$check_e2" "'error' with code -32602"

# [E3] Remove item with missing 'id' parameter
payload_e3='{"jsonrpc": "2.0", "method": "todo.remove", "params": {}, "id": 103}'
check_e3='.error.code == -32602'
run_test "[E3]" "Remove item with missing 'id' parameter" "$payload_e3" "$check_e3" "'error' with code -32602"

# [E4] Remove item with non-existent ID
payload_e4='{"jsonrpc": "2.0", "method": "todo.remove", "params": {"id": 99999}, "id": 104}'
check_e4='.error.code == 1001' # Custom Not Found code
run_test "[E4]" "Remove item with non-existent ID" "$payload_e4" "$check_e4" "'error' with code 1001"

# [E5] Call a non-existent method
payload_e5='{"jsonrpc": "2.0", "method": "invalid.method.name", "params": {}, "id": 105}'
check_e5='.error.code == -32601' # Method not found
run_test "[E5]" "Call a non-existent method" "$payload_e5" "$check_e5" "'error' with code -32601"

# [E6] Send invalid JSON (Should still work without auth as it's caught earlier)
payload_e6='{"jsonrpc": "2.0", "method": "foo", "params": "bar", "id": 1' # Missing closing brace
check_e6='.error.code == -32700'
run_test "[E6]" "Send invalid JSON (No Auth Needed)" "$payload_e6" "$check_e6" "'error' with code -32700"

# [E7] Send valid JSON but not a valid JSON-RPC request (Should still work without auth)
payload_e7='{"hello": "world", "foo": "bar"}'
check_e7='.error.code == -32600'
run_test "[E7]" "Send valid JSON but not JSON-RPC (No Auth Needed)" "$payload_e7" "$check_e7" "'error' with code -32600"

# --- New Auth Test Cases ---
echo -e "\n--- Authentication Specific Tests ---"

# [L1] Failed login attempt (Wrong Password)
payload_l1='{"username": "testuser", "password": "wrongpassword"}'
check_l1='.message | contains("Incorrect username or password")' # Check message from auth router
run_test "[L1]" "Failed login (Wrong Password)" "$payload_l1" "$check_l1" "Error message indicating failure"

# [L2] Failed login attempt (Wrong Username)
payload_l2='{"username": "nonexistent", "password": "password123"}'
check_l2='.message | contains("Incorrect username or password")' # Check message from auth router
run_test "[L2]" "Failed login (Wrong Username)" "$payload_l2" "$check_l2" "Error message indicating failure"

# Clear token to test unauthenticated access
AUTH_TOKEN=""

# [E8] Attempt mcp.discover without token
payload_e8='{"jsonrpc": "2.0", "method": "mcp.discover", "id": 108}'
run_test "[E8]" "Attempt mcp.discover (No Token)" "$payload_e8" "expect_401" "401 Unauthorized response"

# [E9] Attempt todo.add without token
payload_e9='{"jsonrpc": "2.0", "method": "todo.add", "params": {"text": "No Auth"}, "id": 109}'
run_test "[E9]" "Attempt todo.add (No Token)" "$payload_e9" "expect_401" "401 Unauthorized response"

# --- Final Report ---
echo -e "\n--- Testing Complete ---"
echo "=========================="
echo " TOTAL TESTS: $TOTAL_TESTS"
echo "      PASSED: $PASSED_COUNT"
echo "      FAILED: $FAILED_COUNT"
echo "=========================="

# Exit with non-zero status if any tests failed
if [ "$FAILED_COUNT" -ne 0 ]; then
    exit 1
fi

exit 0 