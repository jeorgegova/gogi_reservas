import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://gogireservas.com';
const SITE_NAME = 'GoGi Reservas';
const DEFAULT_OG_IMAGE = '/og-image.jpg';

interface SEOHeadProps {
  title: string;
  description: string;
  pathname?: string;
  noindex?: boolean;
  nofollow?: boolean;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product' | 'software';
  twitterCard?: 'summary' | 'summary_large_image';
}

function toAbsoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function SEOHead({
  title,
  description,
  pathname = '/',
  noindex = false,
  nofollow = false,
  ogImage,
  ogType = 'website',
  twitterCard = 'summary_large_image',
}: SEOHeadProps) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl = `${SITE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
  const ogImg = toAbsoluteUrl(ogImage || DEFAULT_OG_IMAGE);

  const robotsContent = [
    noindex ? 'noindex' : 'index',
    nofollow || noindex ? 'nofollow' : 'follow',
    'max-snippet:160',
    'max-image-preview:large',
    'max-video-preview:-1',
  ].join(', ');

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />
      {noindex && <meta name="googlebot" content="noindex, nofollow" />}

      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImg} />
      <meta property="og:image:alt" content={fullTitle} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="es_CO" />

      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImg} />
      <meta name="twitter:image:alt" content={fullTitle} />
      <meta name="twitter:url" content={canonicalUrl} />
    </Helmet>
  );
}
