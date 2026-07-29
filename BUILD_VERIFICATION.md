# Build Verification

## Source checks completed

- Confirmed all frontend page imports resolve to files in `src/pages`.
- Confirmed route permission keys are represented in the Admin role editor.
- Confirmed no Git merge-conflict markers are present in command-centre source.
- Confirmed no non-Makueni county reference patterns remain in frontend TypeScript source.
- Confirmed JSON files parse successfully.

## Production build command

Run in GitHub Codespaces or the Render build environment:

```bash
corepack enable
pnpm install --frozen-lockfile
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

The current file-processing environment could not download the pnpm package-manager binary because its internal package registry returned HTTP 404. This is an environment limitation rather than a recorded project source error. The project previously built successfully with Vite in the user's Codespaces environment.
