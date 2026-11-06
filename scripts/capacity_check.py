"""Bounded 200-client API check against the dedicated fictional fixture only.
No credentials: uses the app's public publishable key; never retries writes.
"""
import concurrent.futures, json, threading, time, urllib.request, urllib.error, uuid
from pathlib import Path
URL = "https://zymydfwoqawktwgjruue.supabase.co/rest/v1/"
KEY = "sb_publishable_WWKREc-XZ-dtRa6TDGgrdQ_x8OT9lfV"
SID = "6c7fa141-d6f1-4312-a513-7532e9876200"
HEADERS = {"apikey": KEY, "Content-Type": "application/json"}
barrier = threading.Barrier(200, timeout=60)
def call(path, payload=None):
    req = urllib.request.Request(URL+path, data=None if payload is None else json.dumps(payload).encode(), headers=HEADERS)
    with urllib.request.urlopen(req, timeout=90) as result:
        return json.load(result)
def client(index):
    barrier.wait()
    started = time.perf_counter()
    try:
        found = call("surveys?select=id&status=eq.active&id=eq."+SID)
        if not found: raise RuntimeError("Dedicated fixture is not active")
        result = call("rpc/submit_survey_response", {"p_survey_id": SID,"p_anonymous_token":str(uuid.uuid4()),"p_answers":[{"question_id":"6c7fa141-d6f1-4312-a513-7532e9876201","choice_id":"6c7fa141-d6f1-4312-a513-7532e9876202"}]})
        return {"client":index,"ok":True,"seconds":round(time.perf_counter()-started,3),"response_id":result}
    except Exception as error:
        return {"client":index,"ok":False,"seconds":round(time.perf_counter()-started,3),"error":str(error)}
if __name__ == "__main__":
    # Ensure no real survey can be targeted accidentally.
    if not call("surveys?select=id&status=eq.active&id=eq."+SID): raise SystemExit("Fixture must be created explicitly first")
    with concurrent.futures.ThreadPoolExecutor(max_workers=200) as pool:
        results=list(pool.map(client,range(200)))
    times=sorted(item["seconds"] for item in results)
    report={"scope":"200 simultaneous API clients, each reads then submits once; not 200 browser renderings", "clients":200,"successful":sum(item["ok"] for item in results),"mean_seconds":round(sum(times)/200,3),"p95_seconds":times[189],"results":results}
    Path("docs/evidence/capacity-check.json").write_text(json.dumps(report,indent=2))
    print(json.dumps({key:value for key,value in report.items() if key!="results"}))
