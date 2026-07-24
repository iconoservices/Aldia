import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C, TOQUE_MINIMO, RADIO } from '../../theme';

/* ══════════════════════════════════════════════════════════════════
   ReiniciarFinanzas — reinicio selectivo, solo para el pilar Finanzas.
   A diferencia del "Reiniciar Cuenta" del perfil (que borra TODA la
   app), este deja Checklist, Negocio y el resto intactos: Finanzas es
   independiente del resto de pilares, así que su reinicio también.
══════════════════════════════════════════════════════════════════ */

export interface OpcionesReinicioFinanzas {
    transacciones?: boolean;
    deudas?: boolean;
    cuentas?: boolean;
    presupuesto?: boolean;
    gastosFijos?: boolean;
}

interface ReiniciarFinanzasProps {
    open: boolean;
    onClose: () => void;
    clearFinanzasSelectivo: (opciones: OpcionesReinicioFinanzas) => void;
}

const OPCIONES: { key: keyof OpcionesReinicioFinanzas; label: string; desc: string }[] = [
    { key: 'transacciones', label: 'Transacciones', desc: 'Ingresos y gastos registrados (sin contar deudas)' },
    { key: 'deudas', label: 'Deudas', desc: 'Lo que debes y te deben, con sus pagos' },
    { key: 'cuentas', label: 'Cuentas', desc: 'Las cuentas que creaste (Efectivo, Banco, etc.)' },
    { key: 'presupuesto', label: 'Presupuesto mensual', desc: 'Vuelve a S/ 0' },
    { key: 'gastosFijos', label: 'Gastos fijos', desc: 'Servicios y pagos recurrentes configurados' },
];

export const ReiniciarFinanzas = ({ open, onClose, clearFinanzasSelectivo }: ReiniciarFinanzasProps) => {
    const [seleccion, setSeleccion] = useState<OpcionesReinicioFinanzas>({});

    useEffect(() => {
        if (open) setSeleccion({});
    }, [open]);

    const toggle = (key: keyof OpcionesReinicioFinanzas) => {
        setSeleccion(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const hayAlgoSeleccionado = Object.values(seleccion).some(Boolean);

    const confirmar = () => {
        if (!hayAlgoSeleccionado) return;
        const etiquetas = OPCIONES.filter(o => seleccion[o.key]).map(o => o.label).join(', ');
        if (!confirm(`¿Borrar ${etiquetas}?\n\nEsto no se puede deshacer.`)) return;
        clearFinanzasSelectivo(seleccion);
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9997,
                            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                        }}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.97 }}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9998,
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                            padding: 0,
                        }}
                        onClick={onClose}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: C.surfaceLowest,
                                borderRadius: `${RADIO.modal} ${RADIO.modal} 0 0`,
                                padding: '24px', width: '100%', maxWidth: '420px',
                                boxSizing: 'border-box',
                                boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
                                maxHeight: '90vh', overflowY: 'auto',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: C.onSurface }}>
                                    Reiniciar Finanzas
                                </h3>
                                <button
                                    onClick={onClose}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px' }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>close</span>
                                </button>
                            </div>
                            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: C.onSurfaceVariant }}>
                                Elige qué borrar. El resto de Finanzas y los demás pilares (Checklist, Negocio…) no se tocan.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '18px' }}>
                                {OPCIONES.map(o => (
                                    <label
                                        key={o.key}
                                        style={{
                                            display: 'flex', alignItems: 'flex-start', gap: '10px',
                                            padding: '10px 4px', cursor: 'pointer',
                                            borderBottom: `1px solid ${C.surfaceContainerLow}`,
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={!!seleccion[o.key]}
                                            onChange={() => toggle(o.key)}
                                            style={{ accentColor: C.rojo, width: '18px', height: '18px', marginTop: '2px', flexShrink: 0 }}
                                        />
                                        <span>
                                            <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: C.onSurface }}>{o.label}</span>
                                            <span style={{ display: 'block', fontSize: '0.75rem', color: C.onSurfaceVariant }}>{o.desc}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={confirmar}
                                disabled={!hayAlgoSeleccionado}
                                style={{
                                    background: hayAlgoSeleccionado ? C.rojo : C.surfaceContainerHigh,
                                    color: hayAlgoSeleccionado ? '#fff' : C.onSurfaceVariant,
                                    border: 'none', borderRadius: '14px', padding: '14px',
                                    minHeight: `${TOQUE_MINIMO}px`, width: '100%',
                                    fontSize: '1rem', fontWeight: 800, fontFamily: 'inherit',
                                    cursor: hayAlgoSeleccionado ? 'pointer' : 'default',
                                }}
                            >
                                Reiniciar lo seleccionado
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
