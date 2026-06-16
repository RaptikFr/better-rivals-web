// URL canonique du site, source unique pour les métadonnées SEO
// (layout, sitemap, robots, Open Graph…). Surchargeable via l'env en preview.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://better-rivals-fh6.org';
