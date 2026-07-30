# Makueni Command Centre V2.0-A

## Smart Assist and Mobile Redesign

This release starts the controlled Version 2.0 upgrade.

### Included

- Smart Assist becomes a proper full-width mobile bottom sheet.
- Fixes the panel spilling outside the left side of phone screens.
- Keeps the assistant above the mobile bottom navigation.
- Adds Android and iPhone safe-area spacing.
- Uses dynamic viewport height so browser bars and the keyboard are handled better.
- Sticky header and input area.
- Scrollable message history.
- Larger mobile close, reset and send controls.
- Mobile backdrop.
- Prevents the dashboard behind Smart Assist from scrolling on phones.
- Improved long-response wrapping.
- More reliable server-sent-event parsing.
- Clear error when an HTML page is returned instead of assistant data.
- Retains tablet and desktop floating-panel behaviour.
- No OpenAI key is required.

## Installation

Upload this ZIP into:

`/workspaces/makueni-command-centre`

Then run:

```bash
cd /workspaces/makueni-command-centre
unzip -o Makueni_Command_Centre_V2_0_A_Smart_Assist_Mobile.zip
node install-v2-0-a.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5174 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

The build should finish with `✓ built`.

## Commit

```bash
git add artifacts/commandcentre/src/components/ai-assist-panel.tsx \
  install-v2-0-a.mjs V2_0_A_INSTALL.md

git commit -m "V2.0-A Smart Assist mobile redesign"

git push origin makueni-v1
```

Do not commit `.env`.

## Test after Render deploys

Refresh with `Ctrl + Shift + R`.

On a phone:

1. Open Smart Assist.
2. Confirm it fits between the top browser area and bottom navigation.
3. Type `hello`.
4. Scroll the response.
5. Tap the text box and confirm it remains visible when the keyboard opens.
6. Close the assistant using the X button or backdrop.

## Next controlled packages

- V2.0-B — GIS and campaign intelligence
- V2.0-C — Election War Room
- V2.0-D — Production hardening and final responsive polish
