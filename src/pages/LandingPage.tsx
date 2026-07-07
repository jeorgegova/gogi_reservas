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

import { PricingSection } from '@/components/landing/PricingSection';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  // Refrescamos ScrollTrigger después del montaje para asegurar cálculos correctos
  // una vez que todo el contenido dinámico esté renderizado.
  useEffect(() => {
    const refreshTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    const resizeHandler = () => {
      ScrollTrigger.refresh();
    };

    window.addEventListener('resize', resizeHandler);

    return () => {
      clearTimeout(refreshTimeout);
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="relative bg-white overflow-x-hidden">
        <HeroSection />
        <FeaturesSection />
        <ShowcaseSection />
        <GallerySection />
        <PricingSection />
        <Footer />
      </main>
    </>
  );
}
