# Makueni contacts data

- `makueni-contacts-master.csv`: cleaned, deduplicated voter-registry import file (140 unique contacts).
- `makueni-contacts-audit.csv`: audit file showing retained fields, source files and duplicate-source counts.

Import into the configured PostgreSQL database:

```bash
DATABASE_URL="postgresql://..." pnpm --filter @workspace/scripts import-makueni-contacts
```

The import is repeatable. Existing records are skipped when the National ID, voter number or normalized phone number already exists.
