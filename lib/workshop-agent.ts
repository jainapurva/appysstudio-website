// Reaching the workshop agent (agent/workshop-agent.mjs), which runs `claude -p`
// on its own server behind a tunnel. A tunnel can drop mid-workshop, so the
// page asks whether the agent is up before offering "Ask Claude", and falls
// back to paste mode when it isn't.

const HEALTH_TTL_MS = 20_000;
let cached: { ok: boolean; at: number } | null = null;

export function agentBase(): string {
  return (process.env.WORKSHOP_AGENT_URL ?? '').replace(/\/+$/, '');
}

export async function agentUp(): Promise<boolean> {
  if (cached && Date.now() - cached.at < HEALTH_TTL_MS) return cached.ok;
  let ok = false;
  try {
    const res = await fetch(`${agentBase()}/health`, { signal: AbortSignal.timeout(3000), cache: 'no-store' });
    ok = res.ok;
  } catch {
    ok = false;
  }
  cached = { ok, at: Date.now() };
  return ok;
}

/** Test hook: forget the last health check. */
export function resetAgentHealth(): void {
  cached = null;
}
