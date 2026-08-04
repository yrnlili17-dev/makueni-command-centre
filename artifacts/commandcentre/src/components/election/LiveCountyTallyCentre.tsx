import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type Station = Record<string, any>;
type ExistingResult = Record<string, any>;

type CandidateRow = {
  id: string;
  candidateName: string;
  party: string;
  votes: string;
};

function stationCodeOf(row: any) {
  return String(
    row?.code ??
      row?.stationCode ??
      row?.station_code ??
      row?.pollingStationCode ??
      "",
  );
}

function stationNameOf(row: any) {
  return String(
    row?.name ??
      row?.stationName ??
      row?.station_name ??
      row?.pollingStation ??
      "Unnamed station",
  );
}

function wardOf(row: any) {
  return String(row?.ward ?? "UNASSIGNED");
}

function constituencyOf(row: any) {
  return String(row?.constituency ?? "UNASSIGNED");
}

function registeredOf(row: any) {
  return Number(
    row?.registeredVoters ??
      row?.registered_voters ??
      row?.registered ??
      0,
  );
}

function newCandidateRow(): CandidateRow {
  return {
    id: crypto.randomUUID(),
    candidateName: "",
    party: "",
    votes: "",
  };
}

export default function LiveCountyTallyCentre() {
  const [stations, setStations] = useState<Station[]>([]);
  const [existingResults, setExistingResults] = useState<ExistingResult[]>([]);
  const [stationCode, setStationCode] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<CandidateRow[]>([
    newCandidateRow(),
    newCandidateRow(),
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [stationsResponse, resultsResponse] = await Promise.all([
        fetch(`${BASE}api/election-day/stations`, {
          credentials: "include",
        }),
        fetch(`${BASE}api/election-day/results`, {
          credentials: "include",
        }),
      ]);

      if (!stationsResponse.ok || !resultsResponse.ok) {
        throw new Error("Failed to load stations or existing results");
      }

      const [stationsPayload, resultsPayload] = await Promise.all([
        stationsResponse.json(),
        resultsResponse.json(),
      ]);

      setStations(
        Array.isArray(stationsPayload)
          ? stationsPayload
          : Array.isArray(stationsPayload?.stations)
            ? stationsPayload.stations
            : [],
      );

      setExistingResults(
        Array.isArray(resultsPayload)
          ? resultsPayload
          : Array.isArray(resultsPayload?.results)
            ? resultsPayload.results
            : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Live County Tally Centre",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedStation = useMemo(
    () =>
      stations.find(
        (station) => stationCodeOf(station) === stationCode,
      ) ?? null,
    [stationCode, stations],
  );

  const numericRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        votesNumber: Number(row.votes || 0),
      })),
    [rows],
  );

  const totalVotes = numericRows.reduce(
    (sum, row) => sum + row.votesNumber,
    0,
  );

  const registeredVoters = registeredOf(selectedStation);

  const duplicateCandidate = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rows) {
      const key = row.candidateName.trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }, [rows]);

  const stationAlreadyReported = useMemo(
    () =>
      existingResults.some(
        (row) =>
          String(
            row?.stationCode ??
              row?.station_code ??
              "",
          ) === stationCode,
      ),
    [existingResults, stationCode],
  );

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!stationCode) errors.push("Select a polling station.");
    if (!submittedBy.trim()) errors.push("Enter the submitting officer.");
    if (rows.length < 1) errors.push("Add at least one candidate.");
    if (
      rows.some(
        (row) =>
          !row.candidateName.trim() ||
          !row.party.trim() ||
          row.votes === "",
      )
    ) {
      errors.push("Complete candidate, party and vote fields.");
    }
    if (numericRows.some((row) => row.votesNumber < 0)) {
      errors.push("Vote counts cannot be negative.");
    }
    if (duplicateCandidate) {
      errors.push("The same candidate appears more than once.");
    }
    if (registeredVoters > 0 && totalVotes > registeredVoters) {
      errors.push(
        `Candidate votes (${totalVotes}) exceed registered voters (${registeredVoters}).`,
      );
    }

    return errors;
  }, [
    duplicateCandidate,
    numericRows,
    registeredVoters,
    rows,
    stationCode,
    submittedBy,
    totalVotes,
  ]);

  function updateRow(
    id: string,
    field: keyof Omit<CandidateRow, "id">,
    value: string,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      ),
    );
  }

  function removeRow(id: string) {
    setRows((current) =>
      current.length <= 1
        ? current
        : current.filter((row) => row.id !== id),
    );
  }

  async function submitResults() {
    setSuccess("");
    if (validationErrors.length > 0) {
      setError(validationErrors.join(" "));
      return;
    }

    if (
      stationAlreadyReported &&
      !window.confirm(
        "This polling station already has submitted results. Continuing may replace its current tally. Proceed?",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/election-day/results`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stationCode,
            stationName: stationNameOf(selectedStation),
            ward: wardOf(selectedStation),
            constituency: constituencyOf(selectedStation),
            submittedBy: submittedBy.trim(),
            notes: notes.trim() || null,
            results: rows.map((row) => ({
              candidateName: row.candidateName.trim(),
              party: row.party.trim(),
              votes: Number(row.votes || 0),
            })),
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error ??
            body.message ??
            `Submission failed with ${response.status}`,
        );
      }

      setSuccess(
        `Results submitted successfully for ${stationNameOf(
          selectedStation,
        )}.`,
      );
      setRows([newCandidateRow(), newCandidateRow()]);
      setNotes("");
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Results submission failed",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-primary">
            LIVE COUNTY TALLY CENTRE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Polling-station result entry, validation and controlled resubmission.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="flex min-h-10 items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          REFRESH
        </button>
      </header>

      {error && (
        <div className="border border-red-400/40 bg-red-400/5 p-3 text-xs text-red-400">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="border border-green-400/40 bg-green-400/5 p-3 text-xs text-green-400">
          <div className="flex gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[0.8fr_1.2fr]">
        <article className="min-w-0 border border-border bg-card p-4">
          <p className="font-mono text-[10px] tracking-widest">
            POLLING STATION
          </p>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[8px] text-muted-foreground">
                SELECT STATION
              </span>
              <select
                value={stationCode}
                onChange={(event) => setStationCode(event.target.value)}
                className="min-h-10 w-full min-w-0 border border-border bg-background px-3 py-2 text-xs"
              >
                <option value="">Select polling station</option>
                {stations.map((station) => (
                  <option
                    key={stationCodeOf(station)}
                    value={stationCodeOf(station)}
                  >
                    {stationCodeOf(station)} · {stationNameOf(station)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block font-mono text-[8px] text-muted-foreground">
                SUBMITTED BY
              </span>
              <input
                value={submittedBy}
                onChange={(event) => setSubmittedBy(event.target.value)}
                placeholder="Officer or agent name"
                className="min-h-10 w-full min-w-0 border border-border bg-background px-3 py-2 text-xs"
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-mono text-[8px] text-muted-foreground">
                NOTES
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional submission notes"
                className="min-h-24 w-full min-w-0 border border-border bg-background px-3 py-2 text-xs"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div className="border border-border p-3">
                <p className="font-mono text-[7px] text-muted-foreground">
                  REGISTERED
                </p>
                <p className="mt-2 font-mono text-lg">
                  {registeredVoters.toLocaleString("en-KE")}
                </p>
              </div>
              <div className="border border-border p-3">
                <p className="font-mono text-[7px] text-muted-foreground">
                  CANDIDATE VOTES
                </p>
                <p className="mt-2 font-mono text-lg">
                  {totalVotes.toLocaleString("en-KE")}
                </p>
              </div>
            </div>

            {selectedStation && (
              <div className="border border-border p-3 font-mono text-[8px] text-muted-foreground">
                <p>{stationNameOf(selectedStation)}</p>
                <p className="mt-1">
                  {wardOf(selectedStation)} ·{" "}
                  {constituencyOf(selectedStation)}
                </p>
                <p className="mt-1">
                  STATUS:{" "}
                  {stationAlreadyReported
                    ? "ALREADY REPORTED"
                    : "NOT REPORTED"}
                </p>
              </div>
            )}
          </div>
        </article>

        <article className="min-w-0 border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                CANDIDATE VOTE ENTRY
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter one row for each candidate appearing on the station form.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  newCandidateRow(),
                ])
              }
              className="flex min-h-10 items-center justify-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
            >
              <Plus className="h-3 w-3" />
              ADD CANDIDATE
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="grid grid-cols-1 gap-2 border border-border p-3 sm:grid-cols-2 xl:grid-cols-[36px_1fr_0.65fr_0.45fr_40px]"
              >
                <div className="flex h-9 w-9 items-center justify-center border border-border font-mono text-[8px]">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <input
                  value={row.candidateName}
                  onChange={(event) =>
                    updateRow(
                      row.id,
                      "candidateName",
                      event.target.value,
                    )
                  }
                  placeholder="Candidate name"
                  className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
                />

                <input
                  value={row.party}
                  onChange={(event) =>
                    updateRow(row.id, "party", event.target.value)
                  }
                  placeholder="Party"
                  className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
                />

                <input
                  type="number"
                  min="0"
                  value={row.votes}
                  onChange={(event) =>
                    updateRow(row.id, "votes", event.target.value)
                  }
                  placeholder="Votes"
                  className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
                />

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length <= 1}
                  className="flex min-h-10 items-center justify-center border border-border disabled:opacity-40"
                  aria-label={`Remove candidate row ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 border border-border p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[8px] text-muted-foreground">
                  VALIDATION
                </p>
                <p className="mt-1 text-xs">
                  {validationErrors.length === 0
                    ? "Submission is ready."
                    : `${validationErrors.length} issue(s) must be resolved.`}
                </p>
              </div>

              <button
                type="button"
                onClick={submitResults}
                disabled={saving || validationErrors.length > 0}
                className="flex min-h-11 items-center justify-center gap-2 bg-primary px-4 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                SUBMIT RESULTS
              </button>
            </div>

            {validationErrors.length > 0 && (
              <div className="mt-3 space-y-1">
                {validationErrors.map((message) => (
                  <p
                    key={message}
                    className="flex gap-2 text-xs text-muted-foreground"
                  >
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    {message}
                  </p>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>

      <article className="min-w-0 border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-widest">
              RECENT SUBMISSION STATUS
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Current result rows returned by the live election-day API.
            </p>
          </div>
          <Users className="h-4 w-4 text-primary" />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Station</th>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Party</th>
                <th className="px-3 py-2">Votes</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Submitted by</th>
              </tr>
            </thead>
            <tbody>
              {existingResults.slice(0, 100).map((result, index) => (
                <tr
                  key={`${result.id ?? index}`}
                  className="border-b border-border/50"
                >
                  <td className="px-3 py-3">
                    {String(
                      result.stationCode ??
                        result.station_code ??
                        "—",
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {String(
                      result.candidateName ??
                        result.candidate_name ??
                        "—",
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {String(result.party ?? "—")}
                  </td>
                  <td className="px-3 py-3">
                    {Number(result.votes ?? 0).toLocaleString("en-KE")}
                  </td>
                  <td className="px-3 py-3">
                    {String(result.status ?? "submitted")}
                  </td>
                  <td className="px-3 py-3">
                    {String(
                      result.submittedBy ??
                        result.submitted_by ??
                        "—",
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
