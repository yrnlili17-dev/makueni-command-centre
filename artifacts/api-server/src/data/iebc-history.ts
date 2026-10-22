/** Curated official-source extracts. No contact or operational database writes. */
export const IEBC_REVIEW_DATE = "2026-10-22";
export const IEBC_SOURCES = [
  { id: "evaluation-2022", title: "2022 Post Election Evaluation Report", url: "https://www.iebc.or.ke/uploads/resources/pabjKTV6Xa.pdf", scope: "Kenya", electionDates: ["2022-08-09"], locator: "National turnout passage; full report has 184 PDF pages", status: "indexed-extract", note: "Direct PDF download returned HTTP 503. Only indexed passages reviewed; recommendations and local tables have not been fully extracted." },
  { id: "perspective-2022", title: "2022 GE in Perspective", url: "https://www.iebc.or.ke/uploads/resources/eY2ACv8FGq.pdf", scope: "Kenya", electionDates: ["2022-08-09"], locator: "Single-page factsheet: Registered Voters and Voter Turn Out", status: "indexed-extract", note: "National figures only; not measured Makueni turnout." },
  { id: "county-register-2022", title: "Registered Voters per County for the 2022 General Election", url: "https://www.iebc.or.ke/docs/rov_per_county.pdf", scope: "Makueni County", electionDates: ["2022-08-09"], locator: "County 017 MAKUENI row", status: "indexed-extract", note: "Registration snapshot; not a current register or contact count." },
  { id: "presidential-summary-2022", title: "2022 Presidential declaration — national tallying centre", url: "https://www.iebc.or.ke/uploads/resources/QLTlLJx0Vr.pdf", scope: "Makueni County", electionDates: ["2022-08-09"], locator: "Table e1, county 017 MAKUENI COUNTY TOTAL and column headings", status: "indexed-extract", note: "County row and headings reviewed in indexed official PDF text. Original PDF visual review remains outstanding." },
  { id: "evaluation-2017", title: "2017 Post Election Evaluation Report", url: "https://www.iebc.or.ke/uploads/resources/V9UUoGqVBK.pdf", scope: "Kenya", electionDates: ["2017-08-08", "2017-10-26"], locator: "Report cover", status: "discovered", note: "Covers two distinct elections. No local numerical results imported from this report." },
  { id: "forms-2022", title: "IEBC official results forms portal", url: "https://forms.iebc.or.ke/", scope: "Kenya", electionDates: ["2022-08-09"], locator: "Portal", status: "discovered", note: "Discovery source for original forms; no unreviewed ward or station results imported." },
];

export function turnoutPercent(validVotes: number, rejectedBallots: number, registered: number): number | null {
  if (![validVotes, rejectedBallots, registered].every(Number.isSafeInteger) || validVotes < 0 || rejectedBallots < 0 || registered <= 0 || validVotes + rejectedBallots > registered) return null;
  return Math.round((validVotes + rejectedBallots) / registered * 10000) / 100;
}

export function getIebcHistory() {
  const registered = 479516;
  const validVotes = 290819;
  const rejectedBallots = 1908;
  return {
    reviewedAt: IEBC_REVIEW_DATE,
    provenance: "Curated indexed official-source extracts; direct PDF retrieval unavailable at review time. Not a live IEBC feed.",
    sources: IEBC_SOURCES,
    makueni: {
      electionDate: "2022-08-09", office: "President", geography: "Makueni County", sourceId: "presidential-summary-2022", status: "indexed-extract",
      registered, validVotes, rejectedBallots, ballotsCast: validVotes + rejectedBallots,
      turnoutPercent: turnoutPercent(validVotes, rejectedBallots, registered),
      formula: "(valid votes + rejected ballots) / registered voters from the same declaration × 100",
      candidates: [
        { name: "Odinga Raila", votes: 229213 }, { name: "Ruto William Samoei", votes: 59195 },
        { name: "Waihiga David Mwaure", votes: 575 }, { name: "Wajackoyah George Luchiri", votes: 1836 },
      ],
      registerSnapshot: { registered: 479401, sourceId: "county-register-2022", electionDate: "2022-08-09" },
    },
    national: [
      { electionDate: "2017-08-08", scope: "Kenya", turnoutPercent: 78, sourceId: "perspective-2022", status: "indexed-extract" },
      { electionDate: "2022-08-09", scope: "Kenya", turnoutPercent: 64.77, registered: 22120458, sourceId: "perspective-2022", status: "indexed-extract" },
    ],
    quality: [
      "Registration discrepancy: county register 479,401 versus presidential declaration 479,516 (115 difference). Keep both source values; do not silently reconcile.",
      "Derived historical turnout is based on the presidential declaration denominator. It is not an IEBC-published turnout percentage or a governor result.",
      "No verified constituency, ward or polling-station historical results are included in this release.",
      "2017 August general election and October fresh presidential election must remain separate.",
      "Contact records are not the official electoral register, representative polling, consent, or evidence of candidate support.",
      "Historical results alone do not establish current support, a 2027 win probability, or a causal explanation for turnout changes.",
    ],
  };
}

export function getIebcContext(): string {
  const h = getIebcHistory();
  return [
    `IEBC historical evidence reviewed ${h.reviewedAt}. ${h.provenance}`,
    `2022-08-09 PRESIDENT, Makueni County only: declaration registered ${h.makueni.registered}; valid ${h.makueni.validVotes}; rejected ${h.makueni.rejectedBallots}; derived ballots ${h.makueni.ballotsCast}; derived turnout ${h.makueni.turnoutPercent}%. Source: ${IEBC_SOURCES[3]!.url} (${IEBC_SOURCES[3]!.locator}).`,
    `2022 county registration snapshot: 479,401. Source: ${IEBC_SOURCES[2]!.url}. The 115 difference is unresolved.`,
    `KENYA NATIONAL reference: August 2017 turnout 78%; August 2022 turnout 64.77%, registered 22,120,458. Source: ${IEBC_SOURCES[1]!.url}. These are not local rates.`,
    ...h.quality,
    "Use this evidence for neutral historical reporting and operational data-quality review. Cite source links. Do not infer individual preferences, recommend political targeting, invent local results or present assumptions as forecasts.",
  ].join("\n");
}

export function buildIebcSwot() {
  const item = (title: string, detail: string, action: string, impact: string = "high") => ({ title, detail, action, impact, category: "Data quality" });
  return {
    mode: "source-grounded-operational-review", generatedAt: new Date().toISOString(),
    strengths: [item("Traceable historical evidence", "The 2022 presidential county row has identifiable official source columns.", "Retain source, election date, office and geography with each metric.", "medium")],
    weaknesses: [item("Conflicting registration snapshots", "IEBC sources list 479,401 and 479,516 for Makueni; the 115 difference is unresolved.", "Review original declarations before reconciling the two values.")],
    opportunities: [item("Complete original-form verification", "Ward and station historical results are not verified in this release.", "Review official forms and reconcile candidate sums, valid and rejected ballots.", "medium")],
    threats: [item("False precision in forecasts", "National turnout, contacts and scenario assumptions cannot establish current local support.", "Label scope and uncertainty; withhold unsupported win probabilities.")],
    note: "Operational evidence review, not a candidate-strength assessment. Indexed extracts require original PDF review.",
    sources: IEBC_SOURCES, evidence: getIebcHistory(),
  };
}
