import { motion } from 'framer-motion';

/* Pantalla de carga de AlDía — el cerebro que late.
   Se usa en el arranque (pantalla completa) y como fallback al abrir una
   pestaña (inline), para que "cargando" se sienta parte de la app y no un
   texto suelto. */
interface PantallaCargaProps {
    /** Texto bajo el logo. */
    texto?: string;
    /** true = ocupa toda la ventana (arranque); false = un bloque centrado (transición de pestaña). */
    completa?: boolean;
}

export const PantallaCarga = ({ texto = 'Cargando…', completa = false }: PantallaCargaProps) => (
    <div
        style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: completa ? '1.5rem' : '1rem',
            ...(completa
                ? { height: '100vh', width: '100vw', background: '#F7FAF8' }
                : { minHeight: '55vh', width: '100%' }),
        }}
    >
        <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ fontSize: completa ? '4rem' : '2.5rem', lineHeight: 1 }}
        >
            🧠
        </motion.div>
        <div style={{ textAlign: 'center' }}>
            {completa && (
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-carbon)' }}>AlDía</h1>
            )}
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9CA3AF', textTransform: 'uppercase' }}>
                {texto}
            </p>
        </div>
    </div>
);
