import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Phase {
  label: string;
  description: string;
  current?: boolean;
  done?: boolean;
}

interface InfoGap {
  question: string;
  answered?: boolean;
  answer?: string;
}

interface Project {
  id: string;
  icon: string;
  name: string;
  tagline: string;
  description: string;
  status: 'activo' | 'en-progreso' | 'en-espera' | 'idea';
  generatesIncome: boolean;
  color: string;
  tags?: string[];
  phases?: Phase[];
  infoGaps?: InfoGap[];   // preguntas que aún faltan responder
  note?: string;
}

interface Domain {
  id: string;
  icon: string;
  name: string;
  subtitle: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  projects: Project[];
}

// ─── Datos del Ecosistema ─────────────────────────────────────────────────────

const ECOSYSTEM: Domain[] = [
  {
    id: 'icono',
    icon: '🏢',
    name: 'ICONO',
    subtitle: 'Marca madre — administra y agrupa las sub-marcas',
    color: '#4D96FF',
    gradientFrom: '#4D96FF',
    gradientTo: '#C77DFF',
    projects: [
      {
        id: 'icono-agency',
        icon: '📸',
        name: 'ICONO Agency',
        tagline: 'Fotografía profesional + Administración de negocios',
        description:
          'Dos pilares: (1) Sesiones de fotos profesionales (retrato, eventos, productos). (2) Administración de negocios locales mediante marketing — paquetes de gestión igual que los paquetes de sesión fotográfica. El cliente contrata un paquete que incluye estrategia, contenido y presencia digital.',
        status: 'en-progreso',
        generatesIncome: true,
        color: '#4D96FF',
        tags: ['Fotografía', 'Marketing', 'Paquetes', 'Local'],
        phases: [
          { label: 'Fase 1', description: 'Lanzar sesiones de fotos — cartera de clientes iniciales', current: true },
          { label: 'Fase 2', description: 'Lanzar paquetes de administración de negocios con marketing' },
          { label: 'Fase 3', description: 'Escalar: equipo de fotógrafos + ejecutivos de cuenta' },
        ],
        infoGaps: [
          { question: '¿Cuáles son los paquetes de sesión de fotos y sus precios?' },
          { question: '¿Qué incluye exactamente el paquete de administración de negocios?' },
          { question: '¿Cuántos clientes activos hay hoy?' },
        ],
      },
      {
        id: 'icono-os',
        icon: '💻',
        name: 'ICONO OS',
        tagline: 'El software / sistema operativo del ecosistema',
        description:
          'Plataforma de software que da vida a Selva App (Boga + ICONO). Gestión interna, CRM y herramientas para los negocios del ecosistema.',
        status: 'en-progreso',
        generatesIncome: true,
        color: '#C77DFF',
        tags: ['Software', 'Plataforma', 'Tech'],
        phases: [
          { label: 'Fase 1', description: 'Selva App operativa con Boga + ICONO integrados', current: true },
          { label: 'Fase 2', description: 'Contratar programador / delegar mantenimiento' },
          { label: 'Fase 3', description: 'Roadmap v2 — nuevas funcionalidades' },
        ],
        infoGaps: [
          { question: '¿Qué módulos de ICONO OS están activos hoy?' },
          { question: '¿Cuál es el stack técnico actual?' },
        ],
      },
      {
        id: 'icono-360',
        icon: '🔄',
        name: 'ICONO 360',
        tagline: 'Servicio integral — foto + branding + estrategia digital',
        description:
          'Paquete completo 360° para emprendedores y empresas locales. Combina fotografía profesional, identidad de marca, diseño y estrategia de contenido en un solo paquete premium.',
        status: 'en-progreso',
        generatesIncome: true,
        color: '#06D6A0',
        tags: ['Branding', 'Diseño', 'Estrategia'],
        phases: [
          { label: 'Fase 1', description: 'Definir y vender los primeros paquetes 360°', current: true },
          { label: 'Fase 2', description: 'Estandarizar el proceso y crear plantillas' },
        ],
        infoGaps: [
          { question: '¿Qué diferencia a ICONO 360 de ICONO Agency exactamente?' },
          { question: '¿Cuál es el precio de un paquete 360°?' },
        ],
      },
      {
        id: 'juanma',
        icon: '👤',
        name: 'Juanma',
        tagline: 'Marca personal — independiente dentro de ICONO',
        description:
          'Marca personal del creador. Independiente como marca pero administrada bajo ICONO. Construye autoridad, audiencia y confianza — es el rostro del ecosistema.',
        status: 'activo',
        generatesIncome: true,
        color: '#FF8E53',
        tags: ['Personal Brand', 'Creador', 'Audiencia'],
        note: 'ICONO la administra pero es una marca independiente — construye el "por qué confiar" del ecosistema.',
        phases: [
          { label: 'Fase 1', description: 'Presencia constante en redes — cara visible', current: true },
          { label: 'Fase 2', description: 'Comunidad consolidada + monetización personal' },
        ],
        infoGaps: [
          { question: '¿En qué plataformas está activa la marca Juanma?' },
          { question: '¿Qué tipo de contenido publica actualmente?' },
        ],
      },
    ],
  },
  {
    id: 'medios',
    icon: '📡',
    name: 'Medios Digitales',
    subtitle: 'Canales de contenido y comunicación digital',
    color: '#F72585',
    gradientFrom: '#F72585',
    gradientTo: '#06D6A0',
    projects: [
      {
        id: 'ysds',
        icon: '🌴',
        name: 'Yo soy de la Selva',
        tagline: 'Medio de noticias locales — público selvático',
        description:
          'Plataforma de noticias locales. 2 publicaciones diarias enfocadas en la Amazonía: actualidad, cultura, naturaleza. El modelo es crecer la audiencia primero; el dinero viene cuando hay concurrencia.',
        status: 'en-progreso',
        generatesIncome: true,
        color: '#06D6A0',
        tags: ['Noticias', 'Local', 'Amazónico', '2/día'],
        phases: [
          { label: 'Fase 1 ← AHORA', description: 'Subir 2 noticias diarias (boletas de notas) — solo crecer audiencia', current: true },
          { label: 'Fase 2', description: 'Alcanzar audiencia mínima para contratar redactor' },
          { label: 'Fase 3', description: 'Monetizar con publicidad local o patrocinios' },
        ],
        infoGaps: [
          { question: '¿En qué plataformas se publica (Facebook, TikTok, web…)?' },
          { question: '¿Cuántos seguidores/lectores tiene hoy?' },
          { question: '¿Qué tipo de notas funcionan mejor (formato, tema)?' },
        ],
      },
      {
        id: 'rcc',
        icon: '🎬',
        name: 'RCC',
        tagline: 'Canal viral — YouTube / TikTok sin derechos de autor',
        description:
          'Canal de videos virales con contenido libre de derechos (open source / internet). 2 videos diarios. Objetivo inicial: monetización ~$30 USD/mes vía YouTube. Escalar con más canales o editor.',
        status: 'en-progreso',
        generatesIncome: true,
        color: '#F72585',
        tags: ['YouTube', 'TikTok', 'Viral', '2/día', 'Open source'],
        phases: [
          { label: 'Fase 1 ← AHORA', description: 'Subir 2 videos diarios — consistencia y algoritmo', current: true },
          { label: 'Fase 2', description: '1000 subs + 4000 horas → activar monetización YouTube' },
          { label: 'Fase 3', description: 'Escalar a más canales o contratar editor' },
        ],
        infoGaps: [
          { question: '¿Cuántos subs tiene RCC hoy?' },
          { question: '¿Qué tipo de contenido sube actualmente (compilaciones, clips…)?' },
          { question: '¿Tiene canal de YouTube y TikTok activos?' },
        ],
      },
      {
        id: 'cocoa-clips',
        icon: '🍫',
        name: 'Cocoa Clips',
        tagline: 'Canal de clips cortos — curación editorial',
        description:
          'Canal de clips y contenido corto selecto. Complementa a RCC con un enfoque más editorial/temático. Formato short/reel.',
        status: 'en-progreso',
        generatesIncome: true,
        color: '#C77DFF',
        tags: ['Clips', 'Shorts', 'Reels'],
        phases: [
          { label: 'Fase 1 ← AHORA', description: 'Definir el nicho y publicar los primeros clips', current: true },
          { label: 'Fase 2', description: 'Crecimiento y monetización' },
        ],
        infoGaps: [
          { question: '¿En qué plataforma está enfocado Cocoa Clips?' },
          { question: '¿Cuál es el nicho/temática exacta?' },
          { question: '¿Tiene relación directa con RCC o es independiente?' },
        ],
      },
      {
        id: 'geekoedia',
        icon: '🎞️',
        name: 'Geekoedia',
        tagline: 'Canal de películas — en espera',
        description:
          'Canal de reviews, listas y análisis de películas. Desactivado mientras se resuelve el modelo sin derechos de autor. Reactivar cuando haya más capacidad.',
        status: 'en-espera',
        generatesIncome: false,
        color: '#94A3B8',
        tags: ['Películas', 'Geek', 'Reviews'],
        note: '⏸ Inactivo — Reactivar cuando haya capacidad y modelo de contenido definido.',
        phases: [
          { label: 'Pendiente', description: 'Resolver modelo de contenido sin copyright' },
          { label: 'Futuro', description: 'Publicar primeros 10 videos' },
        ],
        infoGaps: [
          { question: '¿Qué modelo de contenido resolvería el tema del copyright?' },
        ],
      },
    ],
  },
  {
    id: 'selva-app',
    icon: '🌿',
    name: 'Selva App',
    subtitle: 'Ecosistema digital local — marketplace + servicios',
    color: '#6BCB77',
    gradientFrom: '#6BCB77',
    gradientTo: '#06D6A0',
    projects: [
      {
        id: 'boga',
        icon: '🛒',
        name: 'Boga Marketplace',
        tagline: 'Marketplace de productos y servicios locales',
        description:
          'Plataforma de compra-venta local. Productos físicos, servicios y eventos. Canal de distribución integrado con ICONO.',
        status: 'en-progreso',
        generatesIncome: true,
        color: '#6BCB77',
        tags: ['Marketplace', 'E-commerce', 'Local'],
        phases: [
          { label: 'Fase 1 ← AHORA', description: 'Activar catálogo y primeros vendedores', current: true },
          { label: 'Fase 2', description: 'Más categorías y mejora de UX' },
          { label: 'Fase 3', description: 'Escalar con más vendedores locales' },
        ],
        infoGaps: [
          { question: '¿Cuántos vendedores/productos hay activos hoy?' },
          { question: '¿Hay transacciones reales ya?' },
        ],
      },
    ],
  },
  {
    id: 'productos',
    icon: '🛍️',
    name: 'Productos',
    subtitle: 'Catálogo físico y digital bajo la marca Selva',
    color: '#FFD93D',
    gradientFrom: '#FFD93D',
    gradientTo: '#F4A261',
    projects: [
      {
        id: 'catalogo-selva',
        icon: '📦',
        name: 'Catálogo Selva',
        tagline: 'Productos propios + combos + terceros en Boga',
        description:
          'Línea de productos bajo la marca Selva. Merch, productos locales, paquetes combo (sesión foto + álbum, pack eventos). Vendidos en Boga y promovidos vía lives de TikTok.',
        status: 'en-progreso',
        generatesIncome: true,
        color: '#FFD93D',
        tags: ['Productos', 'Merch', 'Combos'],
        phases: [
          { label: 'Fase 1 ← AHORA', description: 'Definir el catálogo inicial y subir a Boga', current: true },
          { label: 'Fase 2', description: 'Escalar ventas con lives TikTok' },
        ],
        infoGaps: [
          { question: '¿Qué productos concretos tiene el catálogo hoy?' },
          { question: '¿Cuál es el producto estrella / más vendido?' },
        ],
      },
      {
        id: 'tiktok-lives',
        icon: '📱',
        name: 'Lives TikTok — Ventas',
        tagline: '1–2 lives semanales para vender productos en vivo',
        description:
          'Lives de TikTok enfocados en demostrar y vender el catálogo Selva en tiempo real. Actividad planificada: 1–2 por semana (registrado como hábito semanal).',
        status: 'en-progreso',
        generatesIncome: true,
        color: '#F4A261',
        tags: ['TikTok', 'Live', 'Ventas directas'],
        phases: [
          { label: 'Fase 1 ← AHORA', description: 'Empezar con 1 live semanal y medir conversión', current: true },
          { label: 'Fase 2', description: 'Aumentar frecuencia y variedad de productos' },
        ],
        infoGaps: [
          { question: '¿Ya se hizo el primer live? ¿Resultados?' },
          { question: '¿Qué productos se mostrarán en los lives?' },
        ],
      },
    ],
  },
  {
    id: 'inversiones',
    icon: '🌱',
    name: 'Inversiones',
    subtitle: 'Activos de largo plazo — retorno pasivo',
    color: '#6BCB77',
    gradientFrom: '#6BCB77',
    gradientTo: '#4ade80',
    projects: [
      {
        id: 'aguaje',
        icon: '🌿',
        name: 'Aguaje — Terreno',
        tagline: 'Siembra de palmera amazónica en terreno propio',
        description:
          'Inversión agrícola pasiva en terreno propio. Financiada con excedentes de ICONO/Boga. Retorno a mediano-largo plazo con venta de frutos de aguaje.',
        status: 'en-progreso',
        generatesIncome: true,
        color: '#6BCB77',
        tags: ['Agricultura', 'Pasivo', 'Amazónico'],
        phases: [
          { label: 'Fase 1', description: 'Calcular área, conseguir semillas y sembrar', current: true },
          { label: 'Fase 2', description: 'Plan de riego y mantenimiento' },
          { label: 'Fase 3', description: 'Inicio de cosecha y venta' },
        ],
        infoGaps: [
          { question: '¿Cuántas hectáreas/m² tiene el terreno disponible?' },
          { question: '¿Cuánto tiempo tarda el aguaje en producir?' },
          { question: '¿Cuál es la inversión inicial estimada?' },
        ],
      },
      {
        id: 'local',
        icon: '🏠',
        name: 'Local en Casa',
        tagline: 'Espacio propio de trabajo / atención a clientes',
        description:
          'Construcción de un local profesional en casa. Elimina la dependencia de rentar espacios y centraliza las operaciones de ICONO Agency.',
        status: 'idea',
        generatesIncome: false,
        color: '#F4A261',
        tags: ['Propiedad', 'Construcción'],
        phases: [
          { label: 'Idea', description: 'Definir espacio, planos y cotización', current: true },
          { label: 'Futuro', description: 'Iniciar construcción con fondos disponibles' },
        ],
        infoGaps: [
          { question: '¿Cuánto costaría la construcción?' },
          { question: '¿Qué espacio hay disponible en la propiedad?' },
        ],
      },
    ],
  },
];

// ─── Helpers visuales ─────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  activo:        { bg: '#D1FAE5', color: '#059669', label: '● Activo' },
  'en-progreso': { bg: '#FFF3E8', color: '#FF8E53', label: '▶ En progreso' },
  'en-espera':   { bg: '#F1F5F9', color: '#94A3B8', label: '⏸ En espera' },
  idea:          { bg: '#F5F3FF', color: '#8B5CF6', label: '💡 Idea' },
};

// ─── ProjectCard ──────────────────────────────────────────────────────────────

const ProjectCard = ({ project }: { project: Project }) => {
  const [open, setOpen] = useState(false);
  const badge = STATUS_BADGE[project.status] || STATUS_BADGE['en-progreso'];
  const isOnHold = project.status === 'en-espera';
  const missingCount = (project.infoGaps || []).filter(g => !g.answered).length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: '16px',
        border: `2px solid ${open ? project.color + '55' : isOnHold ? '#E2E8F0' : '#F1F5F9'}`,
        background: isOnHold ? '#F8FAFC' : 'white',
        overflow: 'hidden',
        opacity: isOnHold ? 0.6 : 1,
        filter: isOnHold ? 'grayscale(0.5)' : 'none',
        boxShadow: open ? `0 6px 24px ${project.color}22` : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.25s, border-color 0.25s',
      }}
    >
      {/* Barra de color top */}
      <div style={{
        height: '3px',
        background: isOnHold ? '#CBD5E1' : `linear-gradient(90deg, ${project.color}, ${project.color}66)`,
      }} />

      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '0.85rem 1rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '1.4rem', flexShrink: 0, filter: isOnHold ? 'grayscale(1)' : 'none' }}>
          {project.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 900, color: '#1a1a2e' }}>
              {project.name}
            </span>
            {project.generatesIncome && !isOnHold && (
              <span style={{ fontSize: '0.58rem', fontWeight: 900, background: '#D1FAE5', color: '#059669', padding: '2px 6px', borderRadius: '20px' }}>
                💰
              </span>
            )}
            {missingCount > 0 && (
              <span style={{ fontSize: '0.58rem', fontWeight: 900, background: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <AlertCircle size={9} /> {missingCount} pendientes
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#999', fontWeight: 600, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {project.tagline}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 900, background: badge.bg, color: badge.color, padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
            {badge.label}
          </span>
          <span style={{ color: '#ddd' }}>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </button>

      {/* Expandido */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1rem 1rem', borderTop: `1px dashed ${project.color}30`, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

              {/* Descripción */}
              <p style={{ margin: '0.7rem 0 0', fontSize: '0.79rem', color: '#555', lineHeight: 1.6 }}>
                {project.description}
              </p>

              {/* Nota */}
              {project.note && (
                <div style={{ background: `${project.color}0f`, border: `1px solid ${project.color}25`, borderRadius: '10px', padding: '8px 11px', fontSize: '0.75rem', color: '#666', fontStyle: 'italic' }}>
                  {project.note}
                </div>
              )}

              {/* Fases */}
              {project.phases && project.phases.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Hoja de Ruta
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '7px' }}>
                    {project.phases.map((phase, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: '8px', alignItems: 'flex-start',
                        padding: '7px 10px',
                        borderRadius: '10px',
                        background: phase.current
                          ? `${project.color}15`
                          : phase.done ? '#F0FFF4' : '#FAFAFA',
                        border: phase.current
                          ? `2px solid ${project.color}55`
                          : `1px solid ${phase.done ? '#BBF7D0' : '#eee'}`,
                      }}>
                        <span style={{ fontSize: '0.65rem', flexShrink: 0, marginTop: '1px' }}>
                          {phase.done ? '✅' : phase.current ? '▶' : '○'}
                        </span>
                        <div>
                          <div style={{ fontSize: '0.67rem', fontWeight: 900, color: phase.current ? project.color : '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {phase.label}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: phase.current ? '#333' : '#888', fontWeight: 600, marginTop: '2px' }}>
                            {phase.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info gaps */}
              {project.infoGaps && project.infoGaps.length > 0 && (
                <div>
                  <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={10} /> Info que falta
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '7px' }}>
                    {project.infoGaps.map((gap, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: '8px', alignItems: 'flex-start',
                        fontSize: '0.75rem', color: gap.answered ? '#6BCB77' : '#666',
                        padding: '5px 8px', borderRadius: '8px',
                        background: gap.answered ? '#F0FFF4' : '#FFFBEB',
                        border: `1px solid ${gap.answered ? '#BBF7D0' : '#FDE68A'}`,
                      }}>
                        {gap.answered
                          ? <CheckCircle2 size={12} color="#6BCB77" style={{ flexShrink: 0, marginTop: 1 }} />
                          : <AlertCircle size={12} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />}
                        <span style={{ fontWeight: 600 }}>
                          {gap.question}
                          {gap.answer && <span style={{ display: 'block', color: '#059669', fontStyle: 'italic', marginTop: '2px' }}>{gap.answer}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {project.tags && (
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {project.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: '0.62rem', fontWeight: 800,
                      background: `${isOnHold ? '#94A3B8' : project.color}15`,
                      color: isOnHold ? '#64748B' : project.color,
                      padding: '2px 8px', borderRadius: '20px',
                      border: `1px solid ${isOnHold ? '#94A3B8' : project.color}28`
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── DomainCard ───────────────────────────────────────────────────────────────

const DomainCard = ({ domain, index }: { domain: Domain; index: number }) => {
  const [collapsed, setCollapsed] = useState(false);
  const totalGaps = domain.projects.reduce((acc, p) => acc + (p.infoGaps?.filter(g => !g.answered).length || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      style={{
        borderRadius: '22px', background: 'white',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
        overflow: 'hidden', height: 'fit-content',
      }}
    >
      {/* Header del dominio */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%', background: `linear-gradient(135deg, ${domain.gradientFrom}18, ${domain.gradientTo}10)`,
          borderBottom: `3px solid ${domain.color}22`, border: 'none',
          padding: '1.1rem 1.3rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
        }}
      >
        <div style={{
          width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0,
          background: `linear-gradient(135deg, ${domain.gradientFrom}, ${domain.gradientTo})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', boxShadow: `0 6px 16px ${domain.color}40`,
        }}>
          {domain.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#1a1a2e' }}>{domain.name}</span>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, background: `${domain.color}20`, color: domain.color, padding: '2px 8px', borderRadius: '20px' }}>
              {domain.projects.length}
            </span>
            {totalGaps > 0 && (
              <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#FEF3C7', color: '#D97706', padding: '2px 8px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <AlertCircle size={9} /> {totalGaps}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#999', fontWeight: 600, marginTop: '2px' }}>{domain.subtitle}</div>
        </div>
        <span style={{ color: '#ccc', flexShrink: 0 }}>
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </span>
      </button>

      {/* Lista de proyectos */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {domain.projects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export const EcosistemaMap = () => {
  const totalProjects = ECOSYSTEM.reduce((acc, d) => acc + d.projects.length, 0);
  const activeCount   = ECOSYSTEM.reduce((acc, d) => acc + d.projects.filter(p => p.status === 'activo' || p.status === 'en-progreso').length, 0);
  const incomeCount   = ECOSYSTEM.reduce((acc, d) => acc + d.projects.filter(p => p.generatesIncome).length, 0);
  const totalGaps     = ECOSYSTEM.reduce((acc, d) => acc + d.projects.reduce((a, p) => a + (p.infoGaps?.filter(g => !g.answered).length || 0), 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem 6rem' }}>

      {/* ── Hero header ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
        borderRadius: '24px', padding: '1.8rem 2rem', marginBottom: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
        boxShadow: '0 20px 60px rgba(26,26,46,0.25)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(77,150,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.6rem' }}>🌐</span>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>
              Ecosistema Selva Digital
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            Mapa jerárquico de proyectos, marcas y líneas de negocio
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Dominios',   value: ECOSYSTEM.length, color: '#4D96FF' },
            { label: 'Proyectos',  value: totalProjects,     color: '#C77DFF' },
            { label: 'Activos',    value: activeCount,        color: '#06D6A0' },
            { label: 'Generan $',  value: incomeCount,        color: '#FFD93D' },
            { label: 'Info falta', value: totalGaps,          color: '#F59E0B' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '12px', padding: '9px 14px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Leyenda */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {Object.values(STATUS_BADGE).map(v => (
            <span key={v.label} style={{ fontSize: '0.62rem', fontWeight: 800, background: v.bg + '33', color: v.color, padding: '3px 9px', borderRadius: '20px', border: `1px solid ${v.bg}` }}>
              {v.label}
            </span>
          ))}
          <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#FEF3C7', color: '#D97706', padding: '3px 9px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={9} /> Info pendiente
          </span>
        </div>
      </div>

      {/* ── Grid de dominios (2 col en desktop, 1 en mobile) ─────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
        gap: '1.2rem',
        alignItems: 'start',
      }}>
        {ECOSYSTEM.map((domain, i) => (
          <DomainCard key={domain.id} domain={domain} index={i} />
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#ccc', fontWeight: 600, marginTop: '2rem' }}>
        Haz clic en cualquier proyecto para ver fases, notas e información pendiente
      </p>
    </div>
  );
};
