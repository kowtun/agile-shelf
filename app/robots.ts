import type { MetadataRoute } from 'next';
import { allowIndexing, siteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      ...(allowIndexing ? { allow: '/' } : { disallow: '/' }),
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
