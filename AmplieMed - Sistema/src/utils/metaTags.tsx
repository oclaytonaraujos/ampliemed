import { Helmet } from 'react-helmet-async';
import type { ReactNode } from 'react';

export interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
  children?: ReactNode;
}

/**
 * Component for managing meta tags and SEO
 * Uses React Helmet for dynamic meta tag management
 *
 * @example
 * <MetaTags
 *   title="Patient Details"
 *   description="Patient medical record details"
 * />
 */
export function MetaTags({
  title = 'AmplieMed - Sistema de Consultório Médico',
  description = 'Sistema integrado para consultórios e clínicas médicas',
  keywords = 'consultório, médico, pacientes, agendamento',
  ogTitle,
  ogDescription,
  ogImage,
  canonical,
  children,
}: MetaTagsProps) {
  const fullTitle = title === 'AmplieMed - Sistema de Consultório Médico' 
    ? title 
    : `${title} - AmplieMed`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      {ogTitle && <meta property="og:title" content={ogTitle} />}
      {ogDescription && <meta property="og:description" content={ogDescription} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:type" content="website" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      
      {/* Canonical */}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* No indexing for sensitive medical data */}
      <meta name="robots" content="noindex, nofollow" />
      
      {/* Additional security headers */}
      <meta name="referrer" content="strict-origin-when-cross-origin" />
      
      {children}
    </Helmet>
  );
}

/**
 * Preset for patient-related pages
 */
export function PatientMetaTags({ patientName }: { patientName: string }) {
  return (
    <MetaTags
      title={`Paciente: ${patientName}`}
      description={`Registros médicos e informações do paciente ${patientName}`}
    />
  );
}

/**
 * Preset for dashboard pages
 */
export function DashboardMetaTags() {
  return (
    <MetaTags
      title="Dashboard"
      description="Painel de controle do sistema AmplieMed"
    />
  );
}

/**
 * Preset for schedule pages
 */
export function ScheduleMetaTags() {
  return (
    <MetaTags
      title="Agenda"
      description="Gerenciamento de agendamentos e consultas"
    />
  );
}
