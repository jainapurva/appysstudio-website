import { MetadataRoute } from 'next';

const BASE_URL = 'https://appysstudio.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/custom-swag`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/robotics`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/swayat`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];
}
