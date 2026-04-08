import { useState, useEffect } from 'react';

const IMAGE_CACHE_PREFIX = 'org_image_';

export function useOrganizationImages(slug: string | undefined) {
  const [cachedImages, setCachedImages] = useState<{
    logo_url: string | null;
    login_photo_url: string | null;
  }>({ logo_url: null, login_photo_url: null });

  useEffect(() => {
    if (!slug) {
      setCachedImages({ logo_url: null, login_photo_url: null });
      return;
    }

    // Reset state before trying to fetch new images to avoid flickering old data
    setCachedImages({ logo_url: null, login_photo_url: null });

    // Intentar obtener del caché local
    const cachedLogo = localStorage.getItem(`${IMAGE_CACHE_PREFIX}${slug}_logo`);
    const cachedBg = localStorage.getItem(`${IMAGE_CACHE_PREFIX}${slug}_bg`);

    setCachedImages({
      logo_url: cachedLogo,
      login_photo_url: cachedBg,
    });
  }, [slug]);

  // Función para guardar imágenes en caché
  const cacheImages = (logoUrl: string | null, bgUrl: string | null) => {
    if (!slug) return;

    if (logoUrl) {
      localStorage.setItem(`${IMAGE_CACHE_PREFIX}${slug}_logo`, logoUrl);
    }
    if (bgUrl) {
      localStorage.setItem(`${IMAGE_CACHE_PREFIX}${slug}_bg`, bgUrl);
    }

    setCachedImages({
      logo_url: logoUrl,
      login_photo_url: bgUrl,
    });
  };

  return {
    cachedImages,
    cacheImages,
  };
}
