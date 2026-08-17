#!/usr/bin/env bash
# Waits for qwen3:8b, then re-records key agent runs with it and redeploys.
cd "$(dirname "$0")/.."
mkdir -p logs
until curl -s http://localhost:11434/api/tags | grep -q 'qwen3:8b'; do sleep 60; done
echo "$(date) qwen3:8b available — re-recording" >> logs/upgrade8b.log
export JAL_OLLAMA_MODEL=qwen3:8b JAL_LLM_TIMEOUT=420
uv run python -u -c "
import json
from jal.agents.copilot import chat
out = json.load(open('data/processed/agent_replays.json'))
qs = [
 'As per the Master Plan, what is the total cost of the artificial recharge plan for Rajasthan state?',
 'Which blocks are most likely to worsen next year, and what should we do about the top one?',
]
for q in qs:
    evs = list(chat(q))
    ok = any(e['type']=='text' for e in evs)
    print(q[:50], 'ok' if ok else 'FAILED')
    if ok:
        for e in evs:
            if e['type']=='text': e['recorded']=True
        out['chat'][q] = evs
json.dump(out, open('data/processed/agent_replays.json','w'), ensure_ascii=False)
json.dump(out, open('web/src/data/replays.json','w'), ensure_ascii=False)
" >> logs/upgrade8b.log 2>&1
git add -A && git commit -q -m "Agent replays re-recorded with qwen3:8b" && git push -q
cd web && npx -y vercel deploy --prod --yes >> ../logs/upgrade8b.log 2>&1
echo "$(date) DONE — deployed" >> logs/upgrade8b.log
