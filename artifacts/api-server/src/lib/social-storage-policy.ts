/** Additive storage setup: no contact, tally, existing mention or document changes. */
export const CREATE_SOCIAL_MENTIONS = `CREATE TABLE IF NOT EXISTS public.social_mentions (
  id SERIAL PRIMARY KEY, summary TEXT NOT NULL, source TEXT, url TEXT,
  sentiment TEXT NOT NULL DEFAULT 'neutral', category TEXT NOT NULL DEFAULT 'candidate',
  topic TEXT, published_at TEXT, scanned_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;
export const CREATE_SOCIAL_HEALTH = `CREATE TABLE IF NOT EXISTS public.social_source_health (
  id SERIAL PRIMARY KEY, source_key TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'web_search', status TEXT NOT NULL DEFAULT 'unknown',
  last_attempt_at TIMESTAMP, last_success_at TIMESTAMP, last_item_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT, updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)`;

type StorageState = { mentions: boolean; health: boolean };
export function createSocialStorageInitializer(deps: {
  inspect: () => Promise<StorageState>;
  execute: (statement: string) => Promise<unknown>;
  onHealthError: (error: unknown) => void;
}) {
  let flight: Promise<{ healthReady: boolean }> | null = null;
  return function ensureStorage() {
    if (flight) return flight;
    flight = (async () => {
      const state = await deps.inspect();
      if (!state.mentions) await deps.execute(CREATE_SOCIAL_MENTIONS);
      if (!state.health) {
        try { await deps.execute(CREATE_SOCIAL_HEALTH); }
        catch (error) { deps.onHealthError(error); return { healthReady: false }; }
      }
      return { healthReady: true };
    })().then(result => {
      if (!result.healthReady) flight = null;
      return result;
    }).catch(error => { flight = null; throw error; });
    return flight;
  };
}

/** Optional telemetry must never turn a successful mention save into a failed scan. */
export async function settleSocialHealthWrites(writes: Array<() => Promise<unknown>>, onError: (error: unknown) => void): Promise<string[]> {
  const results = await Promise.allSettled(writes.map(write => Promise.resolve().then(write)));
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  failed.forEach(r => onError(r.reason));
  return failed.length ? ["The scan finished, but source-health logging is unavailable. Saved mentions remain available."] : [];
}

export function socialDatabaseErrorCode(error: unknown): string | null {
  let current = error;
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 6 && current && typeof current === 'object' && !seen.has(current); depth++) {
    seen.add(current);
    const row = current as { code?: unknown; cause?: unknown };
    if (typeof row.code === 'string') return row.code;
    current = row.cause;
  }
  return null;
}
