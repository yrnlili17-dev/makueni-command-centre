type Ward = { ward: string; registered: number; expectedTurnoutRate: number; supportShare: number };
export type AssumptionEdit = { turnout: number; support: number };
const percent = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

/** Pure what-if arithmetic. Inputs are assumptions, not measured preferences. */
export function calculateTurnoutPreview<T extends Ward>(wards: T[], edits: Record<string, AssumptionEdit>, turnoutDelta = 0) {
  const projected = wards.map(ward => {
    const edit = edits[ward.ward] ?? { turnout: ward.expectedTurnoutRate, support: ward.supportShare };
    const turnoutRate = percent(edit.turnout + turnoutDelta);
    const effectiveSupportShare = percent(edit.support);
    const predictedVotes = Math.round(ward.registered * turnoutRate / 100);
    return { ...ward, turnoutRate, effectiveSupportShare, predictedVotes,
      predictedCandidateVotes: Math.round(predictedVotes * effectiveSupportShare / 100) };
  });
  const registered = projected.reduce((sum, w) => sum + w.registered, 0);
  const predictedVotes = projected.reduce((sum, w) => sum + w.predictedVotes, 0);
  const predictedCandidateVotes = projected.reduce((sum, w) => sum + w.predictedCandidateVotes, 0);
  return { wards: projected, totals: { registered, predictedVotes, predictedCandidateVotes,
    predictedTurnoutRate: registered ? Math.round(predictedVotes / registered * 10000) / 100 : 0,
    predictedCandidateShare: predictedVotes ? Math.round(predictedCandidateVotes / predictedVotes * 10000) / 100 : 0 } };
}
