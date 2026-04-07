#!/usr/bin/env python3
"""Bootstrap Paperclip admin via local HTTP API (runs inside container)."""
import urllib.request, urllib.parse, json, http.cookiejar, sys

BASE = "http://127.0.0.1:3100"
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def api(method, path, data=None):
    url = BASE + path
    headers = {"Content-Type": "application/json", "Origin": BASE, "Referer": BASE + "/"}
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = opener.open(req, timeout=30)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": e.code, "body": e.read().decode()[:500]}
    except Exception as e:
        return {"error": str(e)}

print("1. Signing in...")
r = api("POST", "/api/auth/sign-in/email", {
    "email": "aaron@lawyerincorporated.com",
    "password": "Beekerks50$"
})
print(f"   Result: {str(r)[:200]}")

print("2. Creating company...")
r = api("POST", "/api/companies", {
    "name": "Lawyer Incorporated",
    "description": "Attorney-led legal referral service",
    "requireBoardApprovalForNewAgents": False
})
print(f"   Result: {str(r)[:200]}")

print("3. Listing companies...")
r = api("GET", "/api/companies")
print(f"   Result: {str(r)[:200]}")

print("BOOTSTRAP COMPLETE")
