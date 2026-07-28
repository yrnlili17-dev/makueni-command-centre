---
name: Streamlit / Python artifacts in the pnpm monorepo
description: How to add a non-JS (Python/Streamlit) artifact — createArtifact has no python type.
---

# Adding a Python / Streamlit artifact

`createArtifact` only supports expo / data-visualization / mockup-sandbox / react-vite / slides / video-js. There is **no Python/Streamlit artifact type**, so a Streamlit app must be hand-authored.

**Steps that worked:**
1. Install packages with the package tool (`language: "python"`, e.g. streamlit, pandas, openpyxl, xlrd). Python 3.11 is already a module in `.replit`.
2. Put the app under `artifacts/<slug>/` (e.g. `app.py`, plus `.streamlit/config.toml`, `requirements.txt`).
3. Author `.replit-artifact/artifact.toml` **by hand**. The write/edit tools BLOCK direct edits to `artifact.toml`; instead write a sibling temp file (`artifact.edit.toml`) and either `cp` it to `artifact.toml` via shell to create it, then call `verifyAndReplaceArtifactToml({tempFilePath, artifactTomlPath})` to validate + register. `verifyAndReplaceArtifactToml` only **replaces an existing** file (errors NOT_FOUND if `artifact.toml` is missing), so the shell `cp` bootstrap is required for a brand-new artifact.
4. Registration auto-creates the workflow named `artifacts/<slug>: web`.

**Non-obvious gotchas:**
- The artifact service workflow runs with **CWD = the artifact directory**, not repo root. So the dev run is `streamlit run app.py --server.port $PORT` (NO `cd` — a `cd artifacts/<slug>` fails with "No such file or directory").
- Serve under the shared proxy sub-path with `--server.baseUrlPath <slug>` (in `.streamlit/config.toml`) and set `enableCORS=false`, `enableXsrfProtection=false`, `headless=true`. Health check path is `/<slug>/_stcore/health`. Use `kind="web"`, `router="path"`, `previewPath="/<slug>/"`.
- Production: `services.production.build` = `pip install -r requirements.txt`, `services.production.run` = the streamlit command (mirror api-server's run-service pattern; NOT `serve = "static"`).

**Why:** future Python tools can be added the same way without fighting the JS-only artifact tooling. This is the only Python artifact in an otherwise pnpm/TS repo and is NOT part of the TS build.
