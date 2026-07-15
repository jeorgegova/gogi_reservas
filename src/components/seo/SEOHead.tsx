import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description: string;
  noindex?: boolean;
  ogImage?: string;
  ogType?: string;
}

export function SEOHead({ title, description, noindex, ogImage, ogType = 'website' }: SEOHeadProps) {
  const siteName = 'GoGi Reservas';
  const fullTitle = `${title} | ${siteName}`;
  const ogImg = ogImage || '/logo.png';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImg} />
      <meta property="og:site_name" content={siteName} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImg} />
    </Helmet>
  );
}
