import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://agile-shelf.business-app-8904.chatgpt.site/',
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
