import Shelf from './shelf';
import { getLibrary } from '@/lib/library';

const siteUrl = 'https://agile-shelf.business-app-8904.chatgpt.site';

function structuredData(
  books: Awaited<ReturnType<typeof getLibrary>>['books'],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${siteUrl}/#collection`,
    name: 'Agile Shelf',
    url: siteUrl,
    description:
      'A curated reading library for agile teams, thoughtful leaders, and people making lasting change.',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: books.length,
      itemListElement: books.map((book, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${siteUrl}/#book-${book.slug || book.id}`,
        item: {
          '@type': 'Book',
          name: book.bookTitle,
          ...(book.bookSubtitle && { alternativeHeadline: book.bookSubtitle }),
          ...(book.description && { description: book.description }),
          ...(book.coverImageUrl && { image: book.coverImageUrl }),
          ...(book.authors?.length && {
            author: book.authors.map((name) => ({
              '@type': 'Person',
              name,
            })),
          }),
          ...(book.isbn13 || book.isbn10
            ? { isbn: book.isbn13 || book.isbn10 }
            : {}),
          ...(book.bookLanguage && { inLanguage: book.bookLanguage }),
          ...(book.pageCount && { numberOfPages: book.pageCount }),
          ...(book.publisher && {
            publisher: { '@type': 'Organization', name: book.publisher },
          }),
        },
      })),
    },
  };
}

export default async function Home() {
  const library = await getLibrary();
  const jsonLd = JSON.stringify(structuredData(library.books)).replace(
    /</g,
    '\\u003c',
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <div className="preview-note">
        {library.mode === 'preview'
          ? 'Private MVP preview · Hygraph snapshot · Amazon covers and edition details are being completed.'
          : library.mode === 'stale'
            ? 'Showing the last available library data.'
            : 'Connected to Hygraph'}
      </div>
      <Shelf initialBooks={library.books} settings={library.settings} />
    </>
  );
}
