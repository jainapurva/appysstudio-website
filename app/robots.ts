import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api/',
          '/auth/',
          '/account',
          '/cart',
          '/order-success',
          '/shop',   // redirect page — canonical is /
          '/quote',  // redirect page — canonical is /
        ],
      },
    ],
    sitemap: 'https://appysstudio.com/sitemap.xml',
  };
}
