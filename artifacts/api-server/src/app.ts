import express, { type Express } from "express";
import path from "node:path";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import { pool } from "@workspace/db";
import router from "./routes";
import { shortLinkRouter } from "./routes/insights";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the shared reverse proxy so secure cookies work behind HTTPS.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isProd = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET;
if (isProd && !sessionSecret) {
  throw new Error("SESSION_SECRET is required in production but was not provided.");
}

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: false }),
    secret: sessionSecret || "insecure-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.use("/api", router);
app.use("/s", shortLinkRouter);

// Serve the production React dashboard from the same Render service.
// This keeps browser requests and /api routes on one origin, so sessions work
// without cross-domain cookie or CORS configuration.
if (isProd) {
  const dashboardDir = path.resolve(
    process.cwd(),
    "artifacts/commandcentre/dist/public",
  );

  app.use(express.static(dashboardDir));

  app.use((req, res, next) => {
    if (req.method !== "GET" || !req.accepts("html")) {
      return next();
    }

    res.sendFile(path.join(dashboardDir, "index.html"));
  });
}

export default app;
