# Phase 16 — Smart Assist Intelligence Engine + Makueni Database

This package includes the Makueni database you previously supplied and upgrades Smart Assist.

## Database included

- Source: `Makueni_Contacts_Cleaned_Integrated.xlsx`
- Clean records bundled: 140
- Imported into:
  - `voter_registry`
  - `members`
- Duplicate checks use National ID and phone number.
- Existing records are skipped rather than overwritten.

## Smart Assist improvements

Smart Assist can now answer:

- `hello`
- `what are our top priorities?`
- `show database snapshot`
- `show contacts in Ilima`
- `find Christine Mutungi`
- `show polling station Kyamuoso`
- `research water issues in Makueni`

It reads the live PostgreSQL database. No OpenAI API key is required.

## Install

```bash
cd /workspaces/makueni-command-centre
unzip -o Makueni_Command_Centre_Phase16_Intelligence_and_Database.zip
node install-phase16.mjs

source .env
node seed-phase16-makueni.mjs

pnpm --filter @workspace/api-server build
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## Verify imported totals

```bash
node -e "
import('pg').then(async ({default:pg}) => {
 const p=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
 console.log((await p.query('select count(*) from voter_registry')).rows);
 console.log((await p.query('select count(*) from members')).rows);
 await p.end();
})
"
```

## Commit

```bash
git add artifacts seed-phase16-makueni.mjs install-phase16.mjs PHASE16_INSTALL.md
git commit -m "Phase 16 Smart Assist intelligence and Makueni database"
git push origin makueni-v1
```

Do not commit `.env`.
