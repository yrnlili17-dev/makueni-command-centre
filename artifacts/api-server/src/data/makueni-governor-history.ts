/** Indexed primary-source passages, reviewed 22 October 2026. No live tallies. */
export function getMakueniGovernorHistory() {
  const candidates = [
    { name: "Mutula Kilonzo Junior", votes: 214088 },
    { name: "Patrick Mweu Musimba", votes: 63252 },
    { name: "David Masika", votes: 8378 },
    { name: "Emmanuel Mutisya", votes: 2929 },
    { name: "Anderson Kaloki", votes: 843 },
  ];
  return {
    office: "Governor", geography: "Makueni County", electionDate: "2022-08-09", reviewedAt: "2026-10-22",
    verificationStatus: "indexed-primary-source-extract",
    candidates, candidateVoteSum: candidates.reduce((sum, candidate) => sum + candidate.votes, 0),
    registered: null, rejectedBallots: null, ballotsCast: null, turnoutPercent: null,
    sources: [
      { title: "Musimba v IEBC & 2 others [2023] KEHC 1380 (KLR)", date: "2023-02-28", locator: "Judgment, paragraph 1", url: "https://new.kenyalaw.org/akn/ke/judgment/kehc/2023/1380/eng@2023-02-28/source" },
      { title: "Kenya News Agency — Mutula Junior wins Makueni Governor Seat", date: "2022-08-14", locator: "Opening result paragraphs", url: "https://www.kenyanews.go.ke/mutula-junior-wins-makueni-governor-seat/" },
    ],
    note: "Candidate totals are transcribed from indexed Kenya Law and Kenya News Agency passages, not a visually reviewed IEBC Form 37C. The candidate-vote sum is not total ballots cast. Governor-specific registered and rejected ballot figures are not verified here, so historical gubernatorial turnout is withheld. Anderson Kaloki is the candidate named in the 2022 record; this is not a result for Prof. Philip Kaloki. Historical results do not establish 2027 support or a win probability.",
  };
}
