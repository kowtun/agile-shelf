import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectDir = resolve(import.meta.dirname, '..');
const inputPath = resolve(projectDir, 'lib/catalog-preview.json');
const outputDir = resolve(projectDir, 'work/openlibrary');

// ISBNs already verified in Hygraph but not present in the local fallback snapshot.
const verifiedIsbns = new Map(
  Object.entries({
    'The Art of Avoiding a Train Wreck': '9781094752280',
    'Tribal Unity': '9781365359606',
    'Competing Against Luck': '9780062435619',
    "The Innovator's Dilemma": '9781633691780',
    'Inside the Tornado': '9780060745813',
    'Reinventing Organizations': '9782960133509',
    'The Agile Learner': '9781951075873',
    'How to Change the World': '9789081905114',
  }),
);

// Edition identifiers recovered from the official publisher/product sources
// already attached to the Hygraph records. These are not inferred from title
// search results; each value is visible in a product URL, cover URL, or the
// existing print ASIN. They still require an exact Open Library ISBN response
// before any metadata is considered importable.
const editionHints = new Map(
  Object.entries({
    'SAFe 5.0 Distilled': '9780136823407',
    'The Devops Handbook': '1942788002',
    'Value Stream Mapping': '0071828915',
    'Team Topologies': '1942788819',
    'Agile Software Requirements': '9780321635846',
    'Leading Change': '1422186431',
    'The Lean Machine': '9780814432884',
    'The Rollout': '0998162906',
    'Continuous Delivery': '9780321601919',
    'Crossing the Chasm': '9780062292988',
    'Lean Architecture': '9780470684207',
    'Out of the Crisis': '9780262541152',
    Switch: '9780385528757',
    'The Lean Startup': '9780307887894',
    'Training from the Back of the Room!': '9780470472170',
    'Team of Teams': '9781591847489',
    'Measure What Matters': '9780525536222',
    'The Startup Way': '9781101903209',
    'Practical Kanban': '1620556135',
    'Unlocking Agility': '9780134542843',
    'The Design Thinking Playbook': '9781119467472',
    'Innovation Games': '9780321437297',
    'User Story Mapping': '9781491904893',
    'Beyond Entrepreneurship 2.0': '9780399564239',
    Mindset: '9780345472328',
    'Scrum: The Art of Doing Twice the Work in Half the Time': '9780385346450',
    'Lean Thinking': '9780743249270',
    'The Toyota Way': '0071392319',
    'Implementing Lean Software Development': '9780321437389',
    'Our Iceberg Is Melting': '9780399563911',
    'Management 3.0': '9780321712479',
  }),
);

const contact = process.env.OPENLIBRARY_CONTACT?.trim();
const userAgent = contact
  ? `AgileShelfMetadataAudit/1.0 (${contact})`
  : 'AgileShelfMetadataAudit/1.0';
const requestDelay = contact ? 400 : 1100;

function sleep(milliseconds) {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds),
  );
}

async function requestJson(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': userAgent },
        signal: AbortSignal.timeout(20_000),
      });
      if (response.status === 429 || response.status >= 500) {
        const retryAfter =
          Number(response.headers.get('retry-after')) || attempt;
        await sleep(retryAfter * 1000);
        continue;
      }
      if (!response.ok)
        throw new Error(`Open Library returned ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 1500);
    }
  }
  throw lastError || new Error('Open Library request failed');
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

function candidateFromSearch(document) {
  return {
    openLibraryWorkKey: document.key || null,
    openLibraryEditionKey: document.edition_key?.[0] || null,
    title: document.title || null,
    subtitle: document.subtitle || null,
    authors: document.author_name || [],
    publishers: document.publisher?.slice(0, 5) || [],
    publicationDate: document.first_publish_year
      ? String(document.first_publish_year)
      : null,
    pageCount: document.number_of_pages_median || null,
    languages: document.language?.slice(0, 10) || [],
    isbns: document.isbn?.slice(0, 20) || [],
    subjects: document.subject?.slice(0, 12) || [],
    coverUrl: document.cover_i
      ? `https://covers.openlibrary.org/b/id/${document.cover_i}-L.jpg`
      : null,
    sourceUrl: document.key ? `https://openlibrary.org${document.key}` : null,
  };
}

function candidateFromIsbn(record) {
  return {
    openLibraryWorkKey: record.url?.match(/\/works\/[^/]+/)?.[0] || null,
    openLibraryEditionKey: record.identifiers?.openlibrary?.[0] || null,
    title: record.title || null,
    subtitle: record.subtitle || null,
    authors: record.authors?.map((author) => author.name).filter(Boolean) || [],
    publishers:
      record.publishers?.map((publisher) => publisher.name).filter(Boolean) ||
      [],
    publicationDate: record.publish_date || null,
    pageCount: record.number_of_pages || null,
    languages:
      record.languages?.map((language) => language.name).filter(Boolean) || [],
    isbns: [
      ...(record.identifiers?.isbn_13 || []),
      ...(record.identifiers?.isbn_10 || []),
    ],
    subjects:
      record.subjects?.map((subject) => subject.name).filter(Boolean) || [],
    coverUrl: record.cover?.large || record.cover?.medium || null,
    sourceUrl: record.url || null,
  };
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

const books = JSON.parse(await readFile(inputPath, 'utf8'));
const results = [];

for (let index = 0; index < books.length; index += 1) {
  const book = books[index];
  const isbn =
    book.isbn13 ||
    book.isbn10 ||
    verifiedIsbns.get(book.bookTitle) ||
    editionHints.get(book.bookTitle);
  let result;

  try {
    if (isbn) {
      const key = `ISBN:${isbn}`;
      const url = new URL('https://openlibrary.org/api/books');
      url.searchParams.set('bibkeys', key);
      url.searchParams.set('jscmd', 'data');
      url.searchParams.set('format', 'json');
      const payload = await requestJson(url);
      const record = payload[key];
      result = record
        ? {
            status: 'exact_isbn',
            confidence: 100,
            matchReason:
              'Exact verified ISBN match; individual metadata fields still require review',
            candidate: candidateFromIsbn(record),
          }
        : {
            status: 'no_match',
            confidence: 0,
            matchReason: 'Verified ISBN not found in Open Library',
            candidate: null,
          };
    } else {
      const url = new URL('https://openlibrary.org/search.json');
      url.searchParams.set('title', book.bookTitle);
      url.searchParams.set('limit', '5');
      url.searchParams.set(
        'fields',
        'key,title,subtitle,author_name,first_publish_year,edition_key,isbn,publisher,language,number_of_pages_median,cover_i,subject',
      );
      const payload = await requestJson(url);
      const ranked = (payload.docs || [])
        .map((document) => ({
          score: titleScore(book.bookTitle, document.title),
          candidate: candidateFromSearch(document),
        }))
        .sort((a, b) => b.score - a.score);
      const best = ranked[0];
      result = best
        ? {
            status: best.score >= 90 ? 'review_title' : 'review_ambiguous',
            confidence: best.score,
            matchReason:
              best.score >= 90
                ? 'Exact title, but edition must be verified'
                : 'Possible title match; manual verification required',
            candidate: best.candidate,
            alternatives: ranked.slice(1, 3),
          }
        : {
            status: 'no_match',
            confidence: 0,
            matchReason: 'No title candidates returned',
            candidate: null,
          };
    }
  } catch (error) {
    result = {
      status: 'request_failed',
      confidence: 0,
      matchReason: error instanceof Error ? error.message : String(error),
      candidate: null,
    };
  }

  results.push({
    hygraphId: book.id,
    orderId: book.orderId,
    category: book.category?.name || null,
    currentTitle: book.bookTitle,
    verifiedIsbn: isbn || null,
    ...result,
  });
  console.log(
    `[${index + 1}/${books.length}] ${result.status}: ${book.bookTitle}`,
  );
  if (index < books.length - 1) await sleep(requestDelay);
}

const counts = Object.fromEntries(
  [...new Set(results.map((result) => result.status))].map((status) => [
    status,
    results.filter((result) => result.status === status).length,
  ]),
);
const report = {
  generatedAt: new Date().toISOString(),
  source: 'Open Library API',
  sourcePolicy: 'https://openlibrary.org/developers/api',
  writeMode: 'dry-run',
  totalBooks: results.length,
  counts,
  results,
};

await mkdir(outputDir, { recursive: true });
await writeFile(
  resolve(outputDir, 'report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);

const headers = [
  'orderId',
  'category',
  'currentTitle',
  'verifiedIsbn',
  'status',
  'confidence',
  'matchedTitle',
  'authors',
  'publishers',
  'publicationDate',
  'pageCount',
  'languages',
  'sourceUrl',
];
const rows = results.map((result) =>
  [
    result.orderId,
    result.category,
    result.currentTitle,
    result.verifiedIsbn,
    result.status,
    result.confidence,
    result.candidate?.title,
    result.candidate?.authors,
    result.candidate?.publishers,
    result.candidate?.publicationDate,
    result.candidate?.pageCount,
    result.candidate?.languages,
    result.candidate?.sourceUrl,
  ]
    .map(csvCell)
    .join(','),
);
await writeFile(
  resolve(outputDir, 'report.csv'),
  `${headers.join(',')}\n${rows.join('\n')}\n`,
);

console.log(JSON.stringify({ totalBooks: results.length, counts }, null, 2));
