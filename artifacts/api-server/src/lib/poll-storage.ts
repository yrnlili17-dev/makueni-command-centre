import { pool } from "@workspace/db";

let ready: Promise<void> | undefined;
/** Additive and repeatable; existing questions, votes and contacts are preserved. */
export function ensurePollQuestionColumns(): Promise<void> {
  if (!ready) ready = pool.query(`
    ALTER TABLE public.opinion_polls ADD COLUMN IF NOT EXISTS questions jsonb NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE public.poll_votes ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '[]'::jsonb;
  `).then(() => undefined).catch(error => { ready = undefined; throw error; });
  return ready;
}
