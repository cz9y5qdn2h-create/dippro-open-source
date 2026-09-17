import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://iralink-agency.dippro.business';
const SITE_NAME = 'DIPpro';
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const DEFAULT_DESC = "DIPpro automatise la gestion légale du Document d'Information Précontractuelle. Score de conformité Loi Doubin en 30 secondes. Attestation PDF certifiée. Pour franchiseurs français.";

export default function SEOHead({
  title,
  description,
  canonical,
  noindex = false,
  ogType = 'website',
  ogImage,
  lang = 'fr',
}) {
  const fullTitle = title ? `${title} — DIPpro` : 'DIPpro — Gestion légale du DIP pour franchiseurs';
  const metaDesc = description || DEFAULT_DESC;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;
  const image = ogImage || OG_IMAGE;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      )}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="DIPpro — Logiciel de gestion du DIP franchise" />
      <meta property="og:locale" content={lang === 'fr' ? 'fr_FR' : 'en_US'} />
      <meta property="og:locale:alternate" content={lang === 'fr' ? 'en_US' : 'fr_FR'} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content="DIPpro — Logiciel de gestion du DIP franchise" />

      {/* hreflang */}
      {canonicalUrl && <link rel="alternate" hreflang="fr" href={canonicalUrl} />}
      {canonicalUrl && <link rel="alternate" hreflang="en" href={`${canonicalUrl}?lang=en`} />}
      {canonicalUrl && <link rel="alternate" hreflang="x-default" href={canonicalUrl} />}

      {/* Extra SEO */}
      <meta name="author" content="Iralink Agency" />
      <meta name="application-name" content="DIPpro" />
    </Helmet>
  );
}
