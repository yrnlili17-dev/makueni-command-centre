import { Router } from "express";

const router = Router();

router.get("/", async (_req, res) => {
  res.json({
    mode: "foundation",
    summary: {
      registeredVoters: 0,
      turnoutReported: 0,
      turnoutPercentage: 0,
      pollingStations: 0,
      stationsReported: 0,
      agentsAssigned: 0,
      agentsCheckedIn: 0,
      openIncidents: 0,
      criticalIncidents: 0,
      resultsSubmitted: 0,
      resultsVerified: 0,
    },
    stations: [],
    incidents: [],
    results: [],
  });
});

export default router;
