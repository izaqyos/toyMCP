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
BASE_URL="http://127.0.0.1:3000/rpc"
HEADERS="Content-Type:application/json"
PASSED_COUNT=0
FAILED_COUNT=0
TOTAL_TESTS=0

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

    echo -e "\n--- $test_id $description ---"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    # Execute curl command piping payload and using --data-binary @-
    response=$(echo "$payload" | curl -s -X POST -H "$HEADERS" --data-binary @- "$BASE_URL")
    local curl_exit_code=$?

    if [ $curl_exit_code -ne 0 ]; then
        echo "FAILED: HTTP request failed with exit code $curl_exit_code"
        echo "Response:"
        echo "$response" # Show response even on HTTP failure
        FAILED_COUNT=$((FAILED_COUNT + 1))
        return
    fi

    # Check the response with jq
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

# --- Test Execution ---

# [1] Add 'Learn HTTPie'
payload_1='{"jsonrpc": "2.0", "method": "todo.add", "params": {"text": "Learn HTTPie"}, "id": 1}'
check_1='.error == null and .result.text == "Learn HTTPie"'
run_test "[1]" "Add 'Learn HTTPie' (Expected ID: 1 if DB is clean)" "$payload_1" "$check_1" "'result' with correct text, no 'error'"

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

echo -e "\n--- Error Cases ---"

# [E1] Add item with missing 'text' parameter
payload_e1='{"jsonrpc": "2.0", "method": "todo.add", "params": {}, "id": 101}'
check_e1='.error.code == -32602'
run_test "[E1]" "Add item with missing 'text' parameter" "$payload_e1" "$check_e1" "'error' with code -32602"

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

# [E6] Send invalid JSON (Raw body)
echo -e "\n--- [E6] Send invalid JSON (Raw body) ---"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
payload_e6='{"jsonrpc": "2.0", "method": "foo", "params": "bar", "id": 1' # Missing closing brace
# Use pipe and --data-binary @- for consistency
response_e6=$(echo "$payload_e6" | curl -s -X POST -H "$HEADERS" --data-binary @- "$BASE_URL")
curl_exit_code_e6=$?
if [ $curl_exit_code_e6 -ne 0 ]; then
    echo "FAILED: HTTP request failed with exit code $curl_exit_code_e6 (as expected?)"
    # Depending on server/proxy, this might fail HTTP. But our server handles it.
fi
echo "$response_e6" | jq -e '.error.code == -32700' > /dev/null 2>&1
jq_exit_code_e6=$?
if [ $jq_exit_code_e6 -eq 0 ]; then
    echo "SUCCESS"
    echo "$response_e6" | jq '.'
    PASSED_COUNT=$((PASSED_COUNT + 1))
else
    echo "FAILED: Expected error code -32700 (Parse Error)"
    echo "Response:"
    echo "$response_e6" | jq '.'
    FAILED_COUNT=$((FAILED_COUNT + 1))
fi

# [E7] Send valid JSON but not a valid JSON-RPC request
echo -e "\n--- [E7] Send valid JSON but not a valid JSON-RPC request ---"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
payload_e7='{"hello": "world", "foo": "bar"}'
# Use pipe and --data-binary @- for consistency
response_e7=$(echo "$payload_e7" | curl -s -X POST -H "$HEADERS" --data-binary @- "$BASE_URL")
curl_exit_code_e7=$?
if [ $curl_exit_code_e7 -ne 0 ]; then
     echo "FAILED: HTTP request failed with exit code $curl_exit_code_e7"
     echo "Response:"
     echo "$response_e7"
     FAILED_COUNT=$((FAILED_COUNT + 1))
else
    # Check for Invalid Request error
    echo "$response_e7" | jq -e '.error.code == -32600' > /dev/null 2>&1
    jq_exit_code_e7=$?
    if [ $jq_exit_code_e7 -eq 0 ]; then
        echo "SUCCESS"
        echo "$response_e7" | jq '.'
        PASSED_COUNT=$((PASSED_COUNT + 1))
    else
        echo "FAILED: Expected error code -32600 (Invalid Request)"
        echo "Response:"
        echo "$response_e7" | jq '.'
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
fi

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