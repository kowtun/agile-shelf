# Agile Shelf

## Vercel migration

The current branch runs on Next.js for Vercel. See [VERCEL-SETUP.md](VERCEL-SETUP.md)
for deployment settings and DNS setup. Production always reads PUBLISHED
Hygraph content and requires a server-side read token. The development-only
snapshot is never a production fallback. The notes below describe the original
private Sites MVP and its historical editorial status, not current hosting.

English book-library MVP backed by Hygraph. The supplied books.pdf contains 62 books: 9 SAFe Core, 21 SAFe Elective, 32 Other cool stuff.

## Current editorial status

All titles and categories are imported as DRAFT content. Existing Book IDs and bibliographic values are retained. The first PDF count of 61 was corrected by a magnified visual check. Leading Change by John P. Kotter is the selected featured book. Personal recommendations remain empty. Edition-specific metadata requires verification; titles are not enough to choose an ISBN, page count or Amazon product variant. The two books named Accelerate are separate works (Kotter versus Forsgren/Humble/Kim).

Amazon tracking tag: scifor-21. Proposed marketplace: amazon.de, awaiting explicit confirmation. Existing ASIN-based links have been normalised with that tag; no new ASINs were invented. Automatic Amazon images require a verified Creators API credential and applicable image-use/cache handling. No Amazon images have been copied into Hygraph Assets. Book.coverAsset is available for licensed artwork; external coverImageUrl is supported separately.

## CMS

- Book: bibliographic fields, personalNote, keyTakeaways, recommendedFor, isFeatured, category, topics, sourceReferences, metadataReview and Amazon/cover fields.
- BookCategory: editable categories and ordering.
- BookTopic: extensible topic vocabulary.
- LibrarySettings: site introduction and affiliate settings.

The site uses only a server-side read credential. No write credential is needed or included. All imports and schema changes were made through the Hygraph MCP.

## Preview and live data

Without HYGRAPH_READ_TOKEN, the site explicitly shows the included 2026-09-05 snapshot. With server runtime bindings configured, it reads the supplied Content API, paginates through all books, and caches successful responses for 60 seconds. The browser refreshes the library once per minute. Failures retain the last successful server cache where available; otherwise the endpoint returns 503. Tokens never reach browser props.

The user explicitly approved transferring the read-only Hygraph token to this owner-private Site. It is now configured as a protected runtime secret together with the supplied endpoint and DRAFT stage. The production deployment applied environment revision 1. The exact site GraphQL query was verified against the supplied endpoint and returned all 62 records with no errors. Configure secrets only via Sites, never in hosting.json or source. DRAFT mode must remain owner-private. Before a public launch change to PUBLISHED, review metadata/assets and publish approved records and linked categories/topics/settings in Hygraph.

## Development

Run npm install, npm run dev, and npm run build. The Sites manifest identifies the private preview project. .env.example documents runtime binding names; local development bindings may be supplied through the Cloudflare/Vinext environment.

## Remaining before complete delivery

- Verify Amazon credentials and marketplace; fetch accurate product images/edition details.
- Research missing metadata and summaries for every book, preserving unknowns as unknowns.
- Confirm end-to-end refresh from a later Hygraph edit in the authenticated hosted preview.
- Review the private preview and prepare public legal/contact information before public launch.

## Verification

TypeScript check and production build pass. Local /api/library returns 62 books, category counts 9/21/32 and exactly one featured book, Leading Change. All personalNote values are empty. Eight editable topic records are linked to the books. Optional WebMCP search is feature-detected; no supported WebMCP runtime contract test was available, so it is not claimed as verified. Broad browser UI QA was not requested and was not performed.

The Amazon client ID has been provided. The user authorised a connection test, but the exact keychain service Codex Amazon Creators Secret was not found, both with and without an account filter. No Amazon authentication request has yet succeeded or been attempted beyond that missing-keychain preflight.
