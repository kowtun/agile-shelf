# Vercel deployment

Import the private GitHub repository `kowtun/agile-shelf` into the
`christian-dirk-4366s-projects` team.

- Framework preset: Next.js
- Root directory: repository root (`./`)
- Production branch: `main`
- Build command: `npm run build`
- Install command: `npm ci`
- Node.js: 22.x
- Output directory: leave the framework default

Set these server environment variables for Production and Preview:

| Variable | Value |
| --- | --- |
| `HYGRAPH_ENDPOINT` | `https://eu-central-1-shared-euc1-02.cdn.hygraph.com/content/cle8miq2c0kyz01uoerbxelu0/master` |
| `HYGRAPH_READ_TOKEN` | Your read-only Hygraph token; mark sensitive |

Never use a `NEXT_PUBLIC_` prefix for the token. The deployed application
always requests PUBLISHED records, including linked categories, topics,
assets and library settings. Publish those records in Hygraph before launch.
Missing credentials cause an error rather than exposing the local draft snapshot.
Google Books and Amazon API credentials are not needed by the website.

After the first deployment, add `agileshelf.kowtun.net` under Project Settings
→ Domains. Copy the DNS record Vercel specifies to Cloudflare; do not guess
the target. Initially use DNS-only (no Cloudflare proxy) for certificate
validation. Leave all other DNS records unchanged.

Production canonical URLs point to `https://agileshelf.kowtun.net`.
Vercel preview deployments are noindex. Every push to `main` deploys production;
pull requests get preview deployments through Vercel's GitHub integration.

The previous private Sites deployment remains separate. Do not deploy this
Next.js migration using the legacy Sites/Vite configuration.
