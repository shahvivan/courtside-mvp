import json, secrets, sys, urllib.request, http.cookiejar, datetime
B = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3001"
OUT = sys.argv[2] if len(sys.argv) > 2 else "verification/hosted-ai/local-run.json"
cases = json.load(open("../courtside-session8-eval/verification/session8/cases.json"))["cases"]
def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(op, path, body, origin=B, raw=None):
    data = raw if raw is not None else json.dumps(body).encode()
    req = urllib.request.Request(B + path, data=data, method="POST", headers={"Content-Type": "application/json", "Origin": origin})
    try:
        r = op.open(req, timeout=90); return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        t = e.read()
        try: return e.code, json.loads(t or b"{}")
        except ValueError: return e.code, {"error": t.decode(errors="replace")[:200]}
def account(role):
    op = client(); tag = secrets.token_hex(4)
    s, _ = call(op, "/api/account", {"action": "signup", "name": "Test " + role, "email": f"aitest-{role}-{tag}@example.test", "password": secrets.token_urlsafe(16), "role": role})
    assert s == 201, (role, s); return op
org, player, anon = account("organiser"), account("player"), client()
checks = {}
base = {"title": "Check", "sport": "Padel", "venue": "Pine court", "description": ""}
checks["anonymous_403"] = call(anon, "/api/assist", base)[0]
checks["player_403"] = call(player, "/api/assist", base)[0]
checks["cross_origin_403"] = call(org, "/api/assist", base, origin="https://evil.example")[0]
checks["missing_venue_400"] = call(org, "/api/assist", {**base, "venue": ""})[0]
checks["oversized_413"] = call(org, "/api/assist", None, raw=json.dumps({**base, "description": "x" * 6000}).encode())[0]
results = []
for c in cases:
    i = c["input"]
    s, body = call(org, "/api/assist", {"title": i["title"], "sport": i["sport"], "venue": i["venue"], "description": i["description"]})
    results.append({"id": c["id"], "kind": c["kind"], "input": i, "status": s, "response": body})
    print(c["id"], s, (body.get("description") or body.get("error") or "")[:160].replace("\n", " "))
json.dump({"base": B, "ran": datetime.datetime.utcnow().isoformat() + "Z", "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "checks": checks, "results": results}, open(OUT, "w"), indent=2, ensure_ascii=False)
print(json.dumps(checks))
