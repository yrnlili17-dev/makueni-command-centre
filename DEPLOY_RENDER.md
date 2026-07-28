# Fast Render Deployment

1. Push this project to GitHub.
2. In Render, choose **New > Blueprint**.
3. Connect the GitHub repository and select the repository root.
4. Render will detect `render.yaml` and create one free web service.
5. Set `DATABASE_URL` to the Supabase **Session Pooler** PostgreSQL connection string.
6. Leave `SESSION_SECRET` alone; Render generates it automatically.
7. AI variables are optional for the first visual deployment. AI screens will need valid values later.
8. Deploy and open the generated `onrender.com` URL.

The first request after 15 minutes of inactivity can take about a minute because free Render services spin down.
