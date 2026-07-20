/* ══════════════════════════════════════════════════════════════════
   Sistema de diseño de AlDía

   Fuente única de colores, medidas y estilos base. Antes cada dashboard
   llevaba su propia copia de los tokens y su propia detección de móvil,
   así que cambiar un color obligaba a tocar tres archivos y siempre se
   escapaba alguno. Todo lo compartido vive aquí.
══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';

/* ─── Color ──────────────────────────────────────────────────────── */
export const C = {
    primary:                 '#944a18',
    primaryContainer:        '#ff9f66',
    onPrimaryContainer:      '#773401',
    secondary:               '#4858ab',

    surface:                 '#f8f9fa',
    surfaceLowest:           '#ffffff',
    surfaceContainerLow:     '#f3f4f5',
    surfaceContainer:        '#edeeef',
    surfaceContainerHigh:    '#e7e8e9',
    surfaceContainerHighest: '#e1e3e4',

    onSurface:               '#191c1d',
    onSurfaceVariant:        '#54433a',
    outline:                 '#877369',
    outlineVariant:          '#dac2b6',

    // Semánticos: dinero que entra, dinero que sale, avisos
    verde:                   '#10B981',
    rojo:                    '#EF4444',
    ambar:                   '#E6A817',
} as const;

/* Franjas del día — compartidas por Checklist y Bloques */
export const PERIODOS = {
    'Mañana': { icon: 'wb_sunny',   label: 'MAÑANA', color: '#E6A817', bg: 'rgba(230,168,23,0.12)' },
    'Tarde':  { icon: 'light_mode', label: 'TARDE',  color: '#E07040', bg: 'rgba(224,112,64,0.12)' },
    'Noche':  { icon: 'dark_mode',  label: 'NOCHE',  color: '#5C6BC0', bg: 'rgba(92,107,192,0.12)' },
    'Otro':   { icon: 'more_time',  label: 'OTRO',   color: '#877369', bg: 'rgba(135,115,105,0.1)' },
} as const;

/* ─── Medidas ────────────────────────────────────────────────────── */
export const BREAKPOINT_MOVIL = 768;

// En móvil los controles suben a 44px: por debajo de eso el dedo falla.
export const TOQUE_MINIMO = 44;

export const RADIO = {
    chip:   '999px',
    campo:  '12px',
    tarjeta:'1rem',
    modal:  '20px',
} as const;

/* ─── Estilos base ───────────────────────────────────────────────── */
export const bento: React.CSSProperties = {
    background: C.surfaceLowest,
    borderRadius: RADIO.tarjeta,
    border: `1px solid ${C.outlineVariant}`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
};

/** Relleno de página: en móvil se estrecha y deja hueco para la barra inferior. */
export const paddingPagina = (movil: boolean): React.CSSProperties => ({
    padding: movil ? '12px 12px 6rem' : '1.5rem 2rem 3rem',
    minHeight: '100%',
});

/** Campo de formulario. En móvil crece para no fallar al tocarlo. */
export const campo = (movil: boolean): React.CSSProperties => ({
    background: C.surfaceLowest,
    border: `1px solid ${C.outlineVariant}`,
    borderRadius: RADIO.campo,
    padding: movil ? '12px 14px' : '8px 12px',
    outline: 'none',
    fontSize: movil ? '1rem' : '0.85rem',   // 16px evita que iOS haga zoom al enfocar
    color: C.onSurface,
    fontFamily: 'inherit',
    minHeight: movil ? `${TOQUE_MINIMO}px` : undefined,
    boxSizing: 'border-box',
});

/** Botón principal. */
export const botonPrimario = (movil: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    background: C.primary,
    color: '#fff',
    border: 'none',
    borderRadius: RADIO.chip,
    padding: movil ? '12px 20px' : '9px 18px',
    minHeight: movil ? `${TOQUE_MINIMO}px` : undefined,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: movil ? '0.9rem' : '0.85rem',
    fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(148,74,24,0.25)',
});

/** Cabecera de página: título, subtítulo y acciones. */
export const cabecera = (movil: boolean): React.CSSProperties => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: movil ? 'stretch' : 'flex-start',
    flexDirection: movil ? 'column' : 'row',
    flexWrap: 'wrap',
    gap: movil ? '0.75rem' : '1rem',
    marginBottom: '1.25rem',
});

export const tituloPagina: React.CSSProperties = {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: C.onSurface,
    letterSpacing: '-0.01em',
};

export const subtituloPagina: React.CSSProperties = {
    margin: '2px 0 0',
    fontSize: '0.85rem',
    color: C.onSurfaceVariant,
    textTransform: 'capitalize',
};

/** Etiqueta pequeña en mayúsculas para encabezar secciones. */
export const etiqueta: React.CSSProperties = {
    fontSize: '0.66rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: C.outline,
};

/* ─── Formato ────────────────────────────────────────────────────── */
export const MONEDA = 'S/';

/** Importe en soles, siempre en positivo: el signo lo pone quien llama. */
export const money = (n: number) =>
    `${MONEDA} ${Math.abs(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/* ─── Hook de tamaño ─────────────────────────────────────────────── */
/** True cuando la ventana es de móvil. Una sola implementación para toda la app. */
export const useIsMobile = (breakpoint: number = BREAKPOINT_MOVIL) => {
    const [esMovil, setEsMovil] = useState(
        typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
    );

    useEffect(() => {
        const alCambiar = () => setEsMovil(window.innerWidth <= breakpoint);
        alCambiar();
        window.addEventListener('resize', alCambiar);
        return () => window.removeEventListener('resize', alCambiar);
    }, [breakpoint]);

    return esMovil;
};
