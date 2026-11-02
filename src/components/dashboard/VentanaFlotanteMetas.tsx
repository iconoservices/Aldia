import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, Minus, X, GripHorizontal, RotateCcw } from 'lucide-react';
import type { Note, Goal, GoalHorizon } from '../../hooks/useAlDiaState';
import { useIsMobile } from '../../theme';
import { BandejaDashboard } from './BandejaDashboard';

export interface VentanaFlotanteMetasProps {
    notes: Note[];
    addNote: (title: string, content: string, type: 'text' | 'checklist', items: any[], q: string, color: string) => void;
    updateNote: (id: number, updates: Partial<Note>) => void;
    goals: Goal[];
    addGoalMilestone?: (goalId: number, text: string, plazo?: GoalHorizon) => void;
}

export const VentanaFlotanteMetas = ({
    notes,
    addNote,
    updateNote,
    goals,
    addGoalMilestone,
}: VentanaFlotanteMetasProps) => {
    const movil = useIsMobile();
    const [abierta, setAbierta] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [arrastrando, setArrastrando] = useState(false);

    const arrastreRef = useRef<{
        startX: number;
        startY: number;
        startPosX: number;
        startPosY: number;
    } | null>(null);

    // Contar ítems pendientes en Bandeja
    const totalBandejaAbiertas = useMemo(() => {
        const bandeja = notes.find(n => n.type === 'checklist' && n.q === 'bandeja');
        if (!bandeja) return 0;
        return (bandeja.items || []).filter(i => !i.completed).length;
    }, [notes]);

    const handleMandarAMeta = (item: { text: string }, goalId: number) => {
        if (addGoalMilestone) {
            addGoalMilestone(goalId, item.text, 'corto');
        }
    };

    // ── Lógica de arrastre con Pointer Capture ──
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;

        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}

        arrastreRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startPosX: pos.x,
            startPosY: pos.y,
        };
        setArrastrando(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!arrastreRef.current) return;
        const dx = e.clientX - arrastreRef.current.startX;
        const dy = e.clientY - arrastreRef.current.startY;
        setPos({
            x: arrastreRef.current.startPosX + dx,
            y: arrastreRef.current.startPosY + dy,
        });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (arrastreRef.current) {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
            arrastreRef.current = null;
            setArrastrando(false);
        }
    };

    return (
        <>
            {/* ── BOTÓN FLOTANTE ÚNICO: BANDEJA (MINIMIZADO) ── */}
            {!abierta && (
                <div
                    style={{
                        position: 'fixed',
                        right: '20px',
                        bottom: movil ? '84px' : '24px',
                        zIndex: 900,
                    }}
                >
                    <motion.button
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setAbierta(true)}
                        title={`Bandeja de entrada (${totalBandejaAbiertas} sin repartir)`}
                        style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '50%',
                            border: 'none',
                            background: '#0FA97A',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            boxShadow: '0 8px 24px rgba(15,169,122,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                        }}
                    >
                        <Inbox size={24} strokeWidth={2.2} />
                        {totalBandejaAbiertas > 0 && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: '-3px',
                                    right: '-3px',
                                    background: '#EF4444',
                                    color: '#FFFFFF',
                                    borderRadius: '999px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    minWidth: '18px',
                                    textAlign: 'center',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                    lineHeight: 1.2,
                                }}
                            >
                                {totalBandejaAbiertas}
                            </span>
                        )}
                    </motion.button>
                </div>
            )}

            {/* ── CONTENEDOR FLOTANTE POSICIONADO ── */}
            {abierta && (
                <div
                    style={{
                        position: 'fixed',
                        right: movil ? '12px' : '24px',
                        left: movil ? '12px' : 'auto',
                        bottom: movil ? '84px' : '24px',
                        zIndex: 950,
                        transform: `translate(${pos.x}px, ${pos.y}px)`,
                        pointerEvents: 'auto',
                    }}
                >
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.93, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.93, y: 15 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            style={{
                                width: movil ? 'calc(100vw - 24px)' : '480px',
                                height: movil ? 'min(620px, calc(100vh - 110px))' : 'min(780px, calc(100vh - 80px))',
                                maxHeight: '92vh',
                                background: '#FFFFFF',
                                borderRadius: '20px',
                                boxShadow: arrastrando
                                    ? '0 28px 70px rgba(15,23,42,0.32), 0 0 0 1px rgba(15,169,122,0.25)'
                                    : '0 20px 60px rgba(15,23,42,0.24), 0 0 0 1px rgba(0,0,0,0.08)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                transition: 'box-shadow 0.15s ease',
                            }}
                        >
                            {/* Barra de cabecera arrastrable */}
                            <div
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}
                                title="Arrastra desde aquí para mover la ventana"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    background: arrastrando ? '#F1F7F4' : '#F8FAF9',
                                    borderBottom: '1px solid #E2E8F0',
                                    cursor: arrastrando ? 'grabbing' : 'grab',
                                    userSelect: 'none',
                                    touchAction: 'none',
                                    transition: 'background 0.15s ease',
                                }}
                            >
                                {/* Grip & Título de Bandeja */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <GripHorizontal
                                        size={20}
                                        color={arrastrando ? '#0FA97A' : '#94A3B8'}
                                        style={{ cursor: arrastrando ? 'grabbing' : 'grab' }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Inbox size={18} color="#0FA97A" />
                                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>Bandeja</span>
                                        {totalBandejaAbiertas > 0 && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                fontWeight: 800,
                                                padding: '2px 7px',
                                                borderRadius: '999px',
                                                background: '#D1FAE5',
                                                color: '#065F46',
                                            }}>
                                                {totalBandejaAbiertas} sin repartir
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Botones de Control */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {(pos.x !== 0 || pos.y !== 0) && (
                                        <button
                                            onClick={() => setPos({ x: 0, y: 0 })}
                                            title="Restablecer posición inicial"
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: '#E2E8F0',
                                                color: '#475569',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <RotateCcw size={13} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setAbierta(false)}
                                        title="Minimizar a botón flotante"
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: '#E2E8F0',
                                            color: '#475569',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Minus size={15} />
                                    </button>
                                    <button
                                        onClick={() => setAbierta(false)}
                                        title="Cerrar"
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#94A3B8',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <X size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Cuerpo de la Bandeja */}
                            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <BandejaDashboard
                                    notes={notes}
                                    addNote={addNote}
                                    updateNote={updateNote}
                                    flotante={true}
                                    goals={goals}
                                    onMandarAMeta={handleMandarAMeta}
                                />
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}
        </>
    );
};
