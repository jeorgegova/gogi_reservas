/**
 * LandingPage
 * Página de presentación premium con experiencia de scrollytelling.
 * Cada sección es un componente independiente que controla sus propias animaciones
 * mediante GSAP ScrollTrigger, siguiendo una arquitectura modular y mantenible.
 */
import { useEffect } from 'react';
import { ScrollTrigger } from '@/lib/gsap';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { ShowcaseSection } from '@/components/landing/ShowcaseSection';
import { GallerySection } from '@/components/landing/GallerySection';
import { OrganizationsSection } from '@/components/landing/OrganizationsSection';
import { CTASection } from '@/components/landing/CTASection';

export default function LandingPage() {
  // Refrescamos ScrollTrigger después del montaje para asegurar cálculos correctos
  useEffect(() => {
    const timeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timeout);
      // Limpiamos todos los triggers de ScrollTrigger al desmontar la página
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <main className="relative bg-white overflow-x-hidden">
      <HeroSection />
      <FeaturesSection />
      <ShowcaseSection />
      <GallerySection />
      <OrganizationsSection />
      <CTASection />
    </main>
  );
}
