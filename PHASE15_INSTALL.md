# Phase 15 — Smart Assist + Chief Strategist (No API Key)

## Result
The floating assistant responds to `hello` without OpenAI, and Chief Strategist responds using structured campaign guidance and the existing live database digest.

## Install
Upload the ZIP into the project root and run:

```bash
cd /workspaces/makueni-command-centre
unzip -o Makueni_Command_Centre_Phase15_Smart_Assist.zip
node install-phase15.mjs

pnpm --filter @workspace/api-server build
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

Commit only after both builds succeed:

```bash
git add artifacts install-phase15.mjs PHASE15_INSTALL.md
git commit -m "Phase 15 Smart Assist and Chief Strategist no-key engine"
git push origin makueni-v1
```

After Render redeploys, use `Ctrl+Shift+R` in the browser.

## Expected test
Open the floating SMART ASSIST panel and type `hello`.
Expected response begins: `Hello! I am Smart Assist.`
