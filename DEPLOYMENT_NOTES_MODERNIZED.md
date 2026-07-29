# Render Redeployment

Use the existing repository and `makueni-v1` branch.

## Static frontend service

- Root directory: leave blank
- Build command: `corepack enable && pnpm install --frozen-lockfile && PORT=5174 BASE_PATH=/ pnpm --filter @workspace/commandcentre build`
- Publish directory: `artifacts/commandcentre/dist/public`

## Deployment sequence

```bash
git checkout makueni-v1
git add .
git commit -m "Modernize Makueni command centre frontend and RBAC"
git push origin makueni-v1
```

On Render choose **Manual Deploy → Clear build cache & deploy**.

External Meta, X, SMS, email, and AI functionality still depends on valid service credentials and environment variables. No credentials are embedded in this package.
