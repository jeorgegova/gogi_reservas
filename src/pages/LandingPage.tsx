/**
 * LandingPage
 * Página de presentación premium con experiencia de scrollytelling.
 * Cada sección es un componente independiente que controla sus propias animaciones
 * mediante GSAP ScrollTrigger, siguiendo una arquitectura modular y mantenible.
 */
import { useEffect } from 'react';
import { ScrollTrigger } from '@/lib/gsap';
import { SEOHead } from '@/components/seo/SEOHead';
import { Navbar } from '@/components/landing/Navbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { ProblemsSection } from '@/components/landing/ProblemsSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { ShowcaseSection } from '@/components/landing/ShowcaseSection';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { GallerySection } from '@/components/landing/GallerySection';
import { FeaturesGridSection } from '@/components/landing/FeaturesGridSection';
import { DevicesSection } from '@/components/landing/DevicesSection';
import { TrustSection } from '@/components/landing/TrustSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  // Refrescamos ScrollTrigger después del montaje para asegurar cálculos correctos
  // una vez que todo el contenido dinámico esté renderizado.
  useEffect(() => {
    const refreshTimeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    let lastWidth = window.innerWidth;
    const resizeHandler = () => {
      // En móviles el evento resize se dispara al ocultar/mostrar la barra del navegador (cambia la altura),
      // lo cual causaba paros y tirones al cambiar de dirección. Solo refrescamos si cambia el ancho real.
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        ScrollTrigger.refresh();
      }
    };

    window.addEventListener('resize', resizeHandler);

    return () => {
      clearTimeout(refreshTimeout);
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  // Manejo de hash en URL para deep links a secciones
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const el = document.querySelector(hash);
        if (el) {
          setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 300);
        }
      }
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  return (
    <>
      <SEOHead
        title="GoGi Reservas | Software de Reservas y Agenda Online para tu Negocio"
        description="Plataforma de software de reservas y agenda online para barberías, salones de belleza, centros deportivos, coworkings y conjuntos residenciales. Automatiza citas, reduce ausencias y gestiona tu negocio desde un solo panel."
        pathname="/"
        ogType="website"
      />
      <Navbar />
      <main id="main-content" className="relative bg-white overflow-x-hidden">
        <HeroSection />
        <ProblemsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ShowcaseSection />
        <BenefitsSection />
        <GallerySection />
        <FeaturesGridSection />
        <DevicesSection />
        <TrustSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <Footer />
      </main>
    </>
  );
}
