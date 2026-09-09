import 'server-only';
import snapshot from './catalog-preview.json';
import type { Book } from '@/app/shelf';

const defaultSettings = {
  name: 'Agile Shelf',
  introduction:
    'Explore the books behind better teams, thoughtful leadership, and lasting change. From agile foundations to ideas a little further off the beaten path.',
  affiliateTag: 'scifor-21',
  marketplace: 'www.amazon.de',
  affiliateDisclosure:
    'As an Amazon Associate I earn from qualifying purchases.',
};
export type Library = {
  books: Book[];
  settings: typeof defaultSettings;
  mode: 'preview' | 'live' | 'stale';
  updatedAt: string;
};
let cached: { expires: number; value: Library } | undefined;
const fields =
  'id slug bookTitle bookSubtitle authors description personalNote recommendedFor keyTakeaways isbn13 isbn10 publisher edition publicationDate pageCount bookLanguage bookFormat isFeatured orderId amazonAsin amazonAffiliateUrl coverImageUrl coverAlt coverAsset{url} category{name slug} topics{name}';
export async function getLibrary(): Promise<Library> {
  const bindings = process.env;
  const token = bindings.HYGRAPH_READ_TOKEN;
  if (!token && process.env.NODE_ENV === 'production')
    throw new Error('Hygraph read token is required in production.');
  if (!token)
    return {
      books: snapshot,
      settings: defaultSettings,
      mode: 'preview',
      updatedAt: '2026-09-05',
    };
  if (cached && cached.expires > Date.now()) return cached.value;
  const endpoint = bindings.HYGRAPH_ENDPOINT;
  if (!endpoint || !/^https:\/\/[^/]+\.hygraph\.com\/content\//.test(endpoint))
    throw new Error('Hygraph endpoint is not configured.');
  const stage = 'PUBLISHED';
  try {
    let after: string | null = null;
    const books: Book[] = [];
    let settings = defaultSettings;
    do {
      const query = `query Library($after:String){booksConnection(first:100,after:$after,stage:${stage},orderBy:orderId_ASC){edges{node{${fields}}}pageInfo{hasNextPage endCursor}} librarySettingsEntries(first:1,stage:${stage}){name introduction affiliateTag marketplace affiliateDisclosure}}`;
      const response = await fetch(endpoint, {
        cache: 'no-store',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables: { after } }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Hygraph returned ${response.status}`);
      const result = (await response.json()) as {
        errors?: unknown[];
        data?: {
          booksConnection: {
            edges: { node: Book & { coverAsset?: { url: string } | null } }[];
            pageInfo: { hasNextPage: boolean; endCursor: string };
          };
          librarySettingsEntries: Partial<typeof defaultSettings>[];
        };
      };
      if (result.errors?.length || !result.data)
        throw new Error('Hygraph query failed.');
      for (const { node } of result.data.booksConnection.edges)
        books.push({
          ...node,
          coverImageUrl: node.coverImageUrl || node.coverAsset?.url,
        });
      settings = {
        ...defaultSettings,
        ...Object.fromEntries(
          Object.entries(result.data.librarySettingsEntries[0] || {}).filter(
            ([, v]) => typeof v === 'string' && v,
          ),
        ),
      };
      const page = result.data.booksConnection.pageInfo;
      after = page.hasNextPage ? page.endCursor : null;
    } while (after);
    const value: Library = {
      books,
      settings,
      mode: 'live',
      updatedAt: new Date().toISOString(),
    };
    cached = { expires: Date.now() + 60000, value };
    return value;
  } catch {
    if (cached) return { ...cached.value, mode: 'stale' };
    throw new Error(
      'The library is temporarily unavailable. Please try again shortly.',
    );
  }
}
