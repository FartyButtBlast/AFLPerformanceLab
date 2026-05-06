# Deploying AFL Performance Lab

This is a static site. GitHub Pages can host it and GitHub Actions can refresh the season data automatically.

## One-time setup

1. Create a GitHub repository and push this folder to the `main` branch.
2. In GitHub, open the repository settings.
3. Go to **Pages**.
4. Set **Build and deployment** to **GitHub Actions**.
5. Open the **Actions** tab and run **Build and deploy AFL dashboard** once.

GitHub will publish the site at a URL like:

`https://YOUR-USER.github.io/YOUR-REPO/`

## Automatic updates

The workflow in `.github/workflows/deploy-pages.yml` runs:

- whenever you push to `main`
- whenever you trigger it manually
- every two hours, so it picks up new season data soon after games are updated

The automatic build works by polling on a schedule. Each run downloads the latest 2026 season data, rebuilds `data/afl-data.js`, and deploys the refreshed site.

## Local update

To refresh data locally:

```bash
node scripts/build-data.mjs
```

Then open `index.html` or run a local server.

## Login setup

The app uses Supabase Auth for registration, login, and password reset.

1. Create a project at `https://supabase.com`.
2. In Supabase, open **Project Settings > API**.
3. Copy the **Project URL** and **anon public key**.
4. Paste them into `auth-config.js`.
5. In Supabase, open **Authentication > URL Configuration**.
6. Add your GitHub Pages URL as the **Site URL**.
7. Add the same URL to **Redirect URLs**.

The URL will look like:

`https://YOUR-USER.github.io/YOUR-REPO/`

After updating `auth-config.js`, commit and push the change. GitHub Actions will redeploy the site.
