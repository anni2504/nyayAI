#!/usr/bin/env bash
# API integration tests for nyayai-vdb. No external services required.
# Usage: tests/api_test.sh   (expects build/vector-db-server to exist)
set -u

PORT="${VECTORDB_TEST_PORT:-5390}"
SRV="build/vector-db-server"
BASE="http://127.0.0.1:${PORT}"
WORK="$(mktemp -d /tmp/nyayai-vdb-api.XXXXXX)"
DATA_DIR="$WORK/data"
PASS=0
FAIL=0

say()  { printf '%s\n' "$*"; }
fail() { say "  FAIL: $*"; FAIL=$((FAIL+1)); }
ok()   { PASS=$((PASS+1)); }

py() { python3 -c "$1" "${@:2}"; }

# json_call <method> <path> [json-body] -> prints body via stdout, sets http_code
http_code=""
req() {
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    http_code=$(curl -s -o "$WORK/resp.json" -w "%{http_code}" -X "$method" \
      -H 'Content-Type: application/json' -d "$body" "$BASE$path")
  else
    http_code=$(curl -s -o "$WORK/resp.json" -w "%{http_code}" -X "$method" \
      "$BASE$path")
  fi
}

jget() { # <key> -> prints value (string) from resp.json
  py "import json,sys; print(json.load(open('$WORK/resp.json')).get(sys.argv[1],''))" "$1"
}

expect_eq() {
  local desc="$1" got="$2" want="$3"
  if [ "$got" = "$want" ]; then ok; else fail "$desc (got '$got', want '$want')"; fi
}

expect_json_true() {
  local desc="$1" key="$2"
  local v; v=$(py "import json,sys;print(bool(json.load(open('$WORK/resp.json')).get(sys.argv[1])))" "$key")
  if [ "$v" = "True" ]; then ok; else fail "$desc ($key=$v)"; fi
}

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

say "=== starting server on :$PORT ==="
VECTORDB_PORT="$PORT" VECTORDB_DATA_DIR="$DATA_DIR" \
  "$SRV" >"$WORK/server.log" 2>&1 &
SRV_PID=$!

for i in $(seq 1 100); do
  if curl -sf "$BASE/health" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$SRV_PID" 2>/dev/null; then
    say "server died:"; cat "$WORK/server.log"; exit 1
  fi
  sleep 0.05
done
curl -sf "$BASE/health" >/dev/null 2>&1 || { say "server did not come up"; exit 1; }

say "=== health / stats ==="
req GET /health
expect_eq "health status" "$(jget status)" "ok"
expect_json_true "health index present" "index"
expect_eq "health metric default" "$(jget metric)" "cosine"

req GET /stats
expect_eq "health dimension default" "$(jget dimension)" "0"

say "=== insert ==="
req POST /insert '{"document_id":"doc-001","chunk_id":"c1","vector":[1,0,0,0,1,0,0,0],"metadata":{"country":"India","practice_area":"criminal_law","year":"2025","s3_key":"corpus/criminal_law/doc-001.pdf","s3_version_id":"v1","title":"State v. A"}}'
expect_eq "insert created id" "$(jget id)" "doc-001:c1"
expect_json_true "insert created=true" "created"

req POST /insert '{"document_id":"doc-001","chunk_id":"c2","vector":[0.9,0.05,0,0.1,0.8,0,0,0],"metadata":{"country":"India","practice_area":"criminal_law","year":"2025"}}'
expect_json_true "insert created=true" "created"

req POST /search '{"vector":[1,0,0,0,1,0,0,0],"top_k":5,"index":"brute"}'
expect_eq "search status" "$(jget status)" "ok"
expect_eq "search returned" "$(jget returned)" "2"
expect_eq "search result0 id" "$(py "import json;print(json.load(open('$WORK/resp.json'))['results'][0]['id'])")" "doc-001:c1"
expect_eq "search result provenance s3_key" "$(py "import json;print(json.load(open('$WORK/resp.json'))['results'][0]['source']['s3_key'])")" "corpus/criminal_law/doc-001.pdf"
expect_eq "search result has similarity" "$(py "import json;print(isinstance(json.load(open('$WORK/resp.json'))['results'][0]['similarity'],(int,float)))")" "True"

say "=== validation failures ==="
req POST /insert '{"document_id":"doc-X","vector":[1,1]}'
expect_eq "wrong dim rejected" "$(jget status)" "error"
req POST /insert '{"document_id":"doc-X","vector":[NaN,0]}'
expect_eq "NaN rejected" "$(jget status)" "error"
req POST /insert '{"document_id":"doc-X"}'
expect_eq "missing vector rejected" "$(jget status)" "error"
req POST /insert 'not-json'
expect_eq "malformed json rejected" "$(jget status)" "error"
req POST /search '{"vector":{"a":1}}'
expect_eq "non-array vector rejected" "$(jget status)" "error"
req POST /search '{"vector":[1,0,0,0,1,0,0,0],"metric":"fancy"}'
expect_eq "unknown metric rejected" "$(jget status)" "error"
req POST /search '{"vector":[0,0,0,0,0,0,0,0]}'
expect_eq "zero cosine query rejected" "$(jget status)" "error"

say "=== filtered search ==="
req POST /search '{"vector":[1,0,0,0,1,0,0,0],"top_k":10,"index":"brute","filters":{"practice_area":"criminal_law","year":"2025"}}'
expect_json_true "filtered search ok" "status"
expect_eq "filtered all match" "$(py "import json;r=json.load(open('$WORK/resp.json'));print(all(x['metadata']['practice_area']=='criminal_law' and x['metadata']['year']=='2025' for x in r['results']))")" "True"
# AND filter with no matches -> empty but ok
req POST /search '{"vector":[1,0,0,0,1,0,0,0],"top_k":10,"filters":{"practice_area":"property_law"}}'
expect_eq "filter with no matches yields empty" "$(jget returned)" "0"

say "=== delete ==="
req DELETE /delete/doc-001:c2
expect_eq "delete ok" "$(jget status)" "ok"
req GET /stats
expect_eq "count after delete" "$(jget vector_count)" "1"
req DELETE /delete/nope
expect_eq "delete missing 404" "$http_code" "404"

say "=== items / rebuild / index info ==="
req GET "/items?limit=5"
expect_json_true "items ok" "status"
req POST /index/rebuild '{"index":"all","seed":42}'
expect_json_true "rebuild ok" "status"
req GET /index/info
expect_eq "index info active" "$(jget active)" "hnsw"
expect_eq "hnsw config M" "$(py "import json;print(json.load(open('$WORK/resp.json'))['hnsw']['M'])")" "16"

say "=== legal dataset + stats ==="
req POST /dataset/legal '{"count":100,"dimension":8,"seed":9,"clear":true}'
expect_eq "dataset loaded" "$(jget loaded)" "100"
req GET /stats
expect_eq "stats vector_count" "$(jget vector_count)" "100"
expect_eq "stats doc count" "$(py "import json;print(json.load(open('$WORK/resp.json'))['document_count'])")" "100"

say "=== benchmark ==="
req POST /benchmark '{"count":200,"dimension":16,"queries":40,"top_k":10,"ef_search":100,"metric":"cosine","seed":5}'
expect_eq "benchmark status" "$(jget status)" "ok"
expect_eq "benchmark has hnsw speedup" "$(py "import json;print('hnsw_speedup_vs_brute_avg' in json.load(open('$WORK/resp.json')))")" "True"
expect_json_true "benchmark recall reported" "hnsw_recall_at_k"
expect_eq "benchmark methods count" "$(py "import json;print(len(json.load(open('$WORK/resp.json'))['methods']))")" "2"

say "=== unknown route ==="
req GET /nope
expect_eq "unknown route 404 JSON" "$http_code" "404"

say "=== restart persistence ==="
kill "$SRV_PID" 2>/dev/null; wait "$SRV_PID" 2>/dev/null
VECTORDB_PORT="$PORT" VECTORDB_DATA_DIR="$DATA_DIR" \
  "$SRV" >"$WORK/server2.log" 2>&1 &
SRV_PID=$!
for i in $(seq 1 100); do curl -sf "$BASE/health" >/dev/null 2>&1 && break; sleep 0.05; done
req GET /stats
expect_eq "stats vector_count after restart" "$(jget vector_count)" "100"
expect_eq "stats document_count after restart" "$(py "import json;print(json.load(open('$WORK/resp.json'))['document_count'])")" "100"
req POST /search '{"vector":[1,0,0,0,1,0,0,0],"top_k":5}'
expect_eq "search works after restart" "$(jget status)" "ok"

kill "$SRV_PID" 2>/dev/null; wait "$SRV_PID" 2>/dev/null

say "=== API: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] || exit 1
exit 0