# Phase 7 Responsive UI/UX Installation

This package modernizes the Command Centre frontend for phones, tablets, laptops and desktops. It does not change the API, database, authentication or campaign business logic.

## Included
- Mobile slide-out navigation drawer with backdrop
- Sticky mobile header
- Five-button mobile bottom navigation
- Single-column mobile dashboards and two-column tablet layouts
- Responsive dialogs, charts, forms, tabs and tables
- Safe-area support for modern phones
- Mobile-compatible AI Assist panel
- Touch targets of at least 44px
- Horizontal overflow containment

## Install in Codespaces
From `/workspaces/makueni-command-centre`:

```bash
unzip -o Makueni_Command_Centre_Phase7_Responsive_UIUX.zip
pnpm install
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
git status
```

If the build succeeds:

```bash
git add artifacts/commandcentre/src/components/layout.tsx \
        artifacts/commandcentre/src/components/ai-assist-panel.tsx \
        artifacts/commandcentre/src/index.css \
        PHASE7_RESPONSIVE_INSTALL.md
git commit -m "Phase 7 responsive UI UX modernization"
git push origin makueni-v1
```

Do not add `.env` to Git. If it is tracked, run `git rm --cached .env` and keep `.env` in `.gitignore`.
