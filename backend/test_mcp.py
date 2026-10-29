import requests

token = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImE0ZWMyMmExLWNlODMtNDkyYi05YTVhLTZjNTliNDc2MDJlNiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3p1eG1oamppYmtldXp2Z2J5b29nLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5ZTE1ODIwZi02NTRmLTQxZGMtOGUzNS03YjFjZTFhYWIwN2QiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzkwMDE0MzM0LCJpYXQiOjE3OTAwMTA3MzQsImVtYWlsIjoieTczNTgwNDBAZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbCI6Ink3MzU4MDQwQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmdWxsX25hbWUiOiJSYWRoYSIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiOWUxNTgyMGYtNjU0Zi00MWRjLThlMzUtN2IxY2UxYWFiMDdkIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3OTAwMTA3MzR9XSwic2Vzc2lvbl9pZCI6ImQyOTdiMWM5LWMxNzUtNDlhMC1hYjc0LWMxYmY2ZTM0MmRmNSIsImlzX2Fub255bW91cyI6ZmFsc2V9.j3HN9su_FVB47RIYaBBL4gf3ftPtR1xHLtlUwdFpzO8eadh_q_bIl-m8mSgbjHMe-aQYDD2_gtqcaRbjgZRq9g"

url = "http://127.0.0.1:8001/mcp"


# =========================================================
# COMMON HEADERS
# =========================================================

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
}


# =========================================================
# 1. INITIALIZE MCP SESSION
# =========================================================

initialize_body = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2025-06-18",
        "capabilities": {},
        "clientInfo": {
            "name": "test-client",
            "version": "1.0"
        }
    }
}

response = requests.post(
    url,
    headers=headers,
    json=initialize_body
)

print("INITIALIZE STATUS:", response.status_code)

if response.status_code != 200:
    print("INITIALIZE ERROR:")
    print(response.text)
    raise SystemExit

session_id = response.headers.get("mcp-session-id")

print("SESSION:", session_id)


# =========================================================
# 2. SEND PATIENT NOTIFICATION
# =========================================================

tool_headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "Mcp-Session-Id": session_id,
}

tool_body = {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
        "name": "mcp_send_patient_notification",
        "arguments": {
            "patient_id": "90ae3174-37ef-4a01-9d4d-e2fe616cf2b8",
            "message": "Your appointment is scheduled for September 23, 2026 at 10:00 AM."
        }
    }
}

response = requests.post(
    url,
    headers=tool_headers,
    json=tool_body
)


# =========================================================
# 3. DISPLAY RESULT
# =========================================================

print("TOOL STATUS:", response.status_code)

print("TOOL RESPONSE:")
print(response.text)