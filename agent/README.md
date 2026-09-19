# Workshop agent (`claude -p` on a server)

A tiny, dependency-free HTTP server that runs `claude -p` for each kid's prompt on
`/workshop/start` and streams Claude's text back. The website forwards to it
when `WORKSHOP_AGENT_URL` and `WORKSHOP_AGENT_TOKEN` are set.

**It runs on an Anthropic API key only.** `claude -p --bare` reads only
`ANTHROPIC_API_KEY` (never an OAuth/subscription login or keychain), each run
gets an empty private config dir and no tools, and the agent refuses to start
without a key. Claude Code's terms don't allow serving other people's requests
from a Pro/Max login, so don't point it at one.

## Sessions (the Swayat pattern)
Each design on the website gets a session ID. The kid's first message starts a
Claude session in `~/workshop-agent/sessions/<id>/` (`claude -p --session-id`);
follow-ups resume it (`--resume`), so Claude remembers the conversation on the
server. The website also sends the full transcript, so a session lost to a
restart or the 48-hour cleanup is rebuilt automatically. One run per session at
a time (a double-click gets "still thinking"). `SESSIONS_DIR` and
`SESSION_TTL_HOURS` override the defaults.

## Run it
Needs Node 18+ and the Claude Code CLI (`claude`) on the PATH.

```bash
ANTHROPIC_API_KEY=sk-ant-... AGENT_TOKEN=$(openssl rand -hex 24) node workshop-agent.mjs
curl localhost:8787/health
```

| env | default | |
|---|---|---|
| `ANTHROPIC_API_KEY` | required | billed per use; set a spend limit in the Console |
| `AGENT_TOKEN` | required | shared secret; the website sends it as `Authorization: Bearer` |
| `CLAUDE_MODEL` | `claude-opus-5` | e.g. `claude-sonnet-5` or `claude-haiku-4-5` for a cheaper day |
| `MAX_RUNNING` | 3 | concurrent `claude` processes (~200 MB each); extra requests queue |
| `MAX_QUEUED` | 12 | beyond this the agent answers 503 and the kid sees "wait a minute" |
| `PORT` / `HOST` | 8787 / 127.0.0.1 | keep it on localhost and put a tunnel or proxy in front |
| `TIMEOUT_MS` | 180000 | a run is killed after this |

For a long-running install use `workshop-agent.service` (systemd).

## Where to host it
- **Not on the appysstudio EC2 box** unless `MAX_RUNNING=1`: it is a t3.micro
  with ~200-350 MB free, shared with freetools.us.
- **A home/office server** works: expose it with a Cloudflare tunnel
  (`cloudflared tunnel --url http://localhost:8787`) and use that https URL.

## Point the website at it
In `/opt/3dprints-shop/.env` on the web server:
```
WORKSHOP_AGENT_URL=https://<your tunnel or host>
WORKSHOP_AGENT_TOKEN=<same value as AGENT_TOKEN>
WORKSHOP_AI_CODE=<word kids type from the board>
```
then `sudo systemctl restart appysstudio-website`. `GET /api/workshop/design`
returns `{"aiEnabled":true}` and the design step switches from paste mode to
"Ask Claude".
