import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectDir = resolve(import.meta.dirname, '..');
const openLibraryReportPath = resolve(
  projectDir,
  'work/openlibrary/report.json',
);
const outputDir = resolve(projectDir, 'work/google-books');
const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim();

if (!apiKey) {
  throw new Error(
    'GOOGLE_BOOKS_API_KEY is missing. Load it from the local secret store.',
  );
}

const requestDelay = 250;

function sleep(milliseconds) {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds),
  );
}

function normalize(value = '') {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titleScore(expected, actual) {
  const left = normalize(expected);
  const right = normalize(actual);
  if (!left || !right) return 0;
  if (left === right) return 100;
  if (left.includes(right) || right.includes(left)) return 82;
  const leftTokens = new Set(left.split(' '));
  const rightTokens = new Set(right.split(' '));
  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  );
  const union = new Set([...leftTokens, ...rightTokens]);
  return Math.round((intersection.length / union.size) * 100);
}

async function requestJson(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.status === 429 || response.status >= 500) {
        await sleep(attempt * 1000);
        continue;
      }
      if (!response.ok) throw new Error(`Google Books returned ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 1000);
    }
  }
  throw lastError || new Error('Google Books request failed');
}

function candidateFromVolume(item) {
  const info = item.volumeInfo || {};
  const identifiers = Object.fromEntries(
    (info.industryIdentifiers || []).map(({ type, identifier }) => [
      type,
      identifier,
    ]),
  );
  return {
    googleVolumeId: item.id || null,
    title: info.title || null,
    subtitle: info.subtitle || null,
    authors: info.authors || [],
    publisher: info.publisher || null,
    publishedDate: info.publishedDate || null,
    description: info.description || null,
    pageCount: Number.isInteger(info.pageCount) ? info.pageCount : null,
    categories: info.categories || [],
    language: info.language || null,
    isbn13: identifiers.ISBN_13 || null,
    isbn10: identifiers.ISBN_10 || null,
    maturityRating: info.maturityRating || null,
    sourceUrl: item.id
      ? `https://books.google.com/books?id=${encodeURIComponent(item.id)}`
      : null,
  };
}

const openLibraryReport = JSON.parse(
  await readFile(openLibraryReportPath, 'utf8'),
);
const pending = openLibraryReport.results.filter(
  ({ status }) => status !== 'exact_isbn',
);
const results = [];

for (let index = 0; index < pending.length; index += 1) {
  const book = pending[index];
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set(
    'q',
    book.verifiedIsbn
      ? `isbn:${book.verifiedIsbn}`
      : `intitle:"${book.currentTitle}"`,
  );
  url.searchParams.set('maxResults', '5');
  url.searchParams.set('printType', 'books');
  url.searchParams.set('projection', 'full');
  url.searchParams.set('key', apiKey);

  let result;
  try {
    const payload = await requestJson(url);
    const ranked = (payload.items || [])
      .map(candidateFromVolume)
      .map((candidate) => {
        const exactIsbn = Boolean(
          book.verifiedIsbn &&
            [candidate.isbn13, candidate.isbn10].includes(book.verifiedIsbn),
        );
        return {
          exactIsbn,
          score: exactIsbn ? 100 : titleScore(book.currentTitle, candidate.title),
          candidate,
        };
      })
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    result = best
      ? {
          status: best.exactIsbn
            ? 'exact_isbn'
            : best.score >= 90
              ? 'review_title'
              : 'review_ambiguous',
          confidence: best.score,
          candidate: best.candidate,
          alternatives: ranked.slice(1, 3),
        }
      : { status: 'no_match', confidence: 0, candidate: null };
  } catch (error) {
    result = {
      status: 'request_failed',
      confidence: 0,
      candidate: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  results.push({
    hygraphId: book.hygraphId,
    orderId: book.orderId,
    category: book.category,
    currentTitle: book.currentTitle,
    verifiedIsbn: book.verifiedIsbn,
    previousStatus: book.status,
    ...result,
  });
  console.log(
    `[${index + 1}/${pending.length}] ${result.status}: ${book.currentTitle}`,
  );
  if (index < pending.length - 1) await sleep(requestDelay);
}

const counts = Object.fromEntries(
  [...new Set(results.map(({ status }) => status))].map((status) => [
    status,
    results.filter((result) => result.status === status).length,
  ]),
);
const report = {
  generatedAt: new Date().toISOString(),
  source: 'Google Books API',
  writeMode: 'dry-run',
  inputBooks: pending.length,
  counts,
  results,
};

await mkdir(outputDir, { recursive: true });
await writeFile(
  resolve(outputDir, 'report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);

console.log(JSON.stringify({ inputBooks: pending.length, counts }, null, 2));
