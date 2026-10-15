import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

/* Guardia de "sin cuenta": un movimiento que mueve plata NO puede quedar anotado sin
   cuenta por descuido. Hay que elegir de dónde sale (o a dónde entra), o confirmar a
   propósito que no va a ninguna cuenta. Cerrar la ventana descarta el movimiento. */

interface Props {
    open: boolean;
    texto: string;
    monto: number;
    tipo: 'ingreso' | 'gasto';
    accounts: { id: number; name: string; color: string }[];
    onElegir: (accountId: number) => void;
    onSinCuenta: () => void;
    onDescartar: () => void;
}

export const PedirCuentaDialog = ({ open, texto, monto, tipo, accounts, onElegir, onSinCuenta, onDescartar }: Props) => {
    const [paso, setPaso] = useState<'elegir' | 'confirmar'>('elegir');
    useEffect(() => { if (open) setPaso('elegir'); }, [open]);

    const importe = `S/ ${Math.abs(monto).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    const esGasto = tipo === 'gasto';

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', padding: '20px' }}
                >
                    <motion.div
                        initial={{ scale: 0.94, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                        style={{ background: '#fff', borderRadius: '24px', padding: '22px', width: '100%', maxWidth: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
                    >
                        {paso === 'elegir' ? (
                            <>
                                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#0C2A20' }}>
                                    {esGasto ? '¿De qué cuenta sale?' : '¿A qué cuenta entra?'}
                                </h3>
                                <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#6C8079' }}>
                                    <b style={{ color: '#0C2A20' }}>{texto}</b> · {esGasto ? '−' : '+'}{importe}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '40dvh', overflowY: 'auto' }}>
                                    {accounts.map(a => (
                                        <button key={a.id} onClick={() => onElegir(a.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 14px', borderRadius: '14px', border: '1.5px solid #DCE7E1', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.92rem', fontWeight: 700, color: '#0C2A20', textAlign: 'left' }}>
                                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                                            {a.name}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => setPaso('confirmar')} style={{ marginTop: '12px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#6C8079', fontSize: '0.8rem', fontWeight: 700, fontFamily: 'inherit', padding: '6px' }}>
                                    No anotarlo en ninguna cuenta
                                </button>
                                <button onClick={onDescartar} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#C63C3C', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit', padding: '4px' }}>
                                    Cancelar (no registrar este movimiento)
                                </button>
                            </>
                        ) : (
                            <>
                                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#FFF4E0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#B9760A' }}>help</span>
                                </div>
                                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: '#0C2A20' }}>¿Seguro que no va a ninguna cuenta?</h3>
                                <p style={{ margin: '0 0 18px', fontSize: '0.88rem', color: '#6C8079', lineHeight: 1.5 }}>
                                    "{texto}" ({esGasto ? '−' : '+'}{importe}) contará en tu total, pero no {esGasto ? 'saldrá de' : 'entrará a'} ninguna cuenta, y los saldos por cuenta no van a cuadrar. Solo hazlo si estás seguro.
                                </p>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => setPaso('elegir')} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: '2px solid #E5E7EB', background: '#fff', color: '#4A5F58', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Elegir cuenta</button>
                                    <button onClick={onSinCuenta} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: '#C63C3C', color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Sí, sin cuenta</button>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
};
