import type { MetadataRoute } from 'next';

/** The tool is private: ask every crawler to stay out. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
