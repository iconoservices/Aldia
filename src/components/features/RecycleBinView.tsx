import { motion, AnimatePresence } from 'framer-motion';
import type { TrashItem } from '../../hooks/useAlDiaState';

interface Props {
    open: boolean;
    trash: TrashItem[];
    onRestore: (id: number) => void;
    onClear: () => void;
    onClose: () => void;
}

export const RecycleBinView = ({ open, trash, onRestore, onClear, onClose }: Props) => {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px',
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'white', borderRadius: '24px', padding: '24px',
                            width: '100%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#191c1d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#944a18' }}>delete</span>
                                Papelera
                            </h3>
                            <button onClick={onClose} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: '#877369', padding: '4px', display: 'flex',
                            }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {trash.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#877369', fontSize: '0.85rem', fontWeight: 600, padding: '40px 0' }}>
                                La papelera está vacía
                            </p>
                        ) : (
                            <>
                                {trash.map(item => (
                                    <div key={item.block.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '12px 0', borderBottom: '1px solid #F3F4F6',
                                    }}>
                                        <div style={{
                                            width: '8px', height: '8px', borderRadius: '50%',
                                            background: '#D1D5DB', flexShrink: 0,
                                        }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#191c1d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.block.label}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.7rem', color: '#877369' }}>
                                                {item.block.period} · {new Date(item.deletedAt).toLocaleDateString('es-MX')} {new Date(item.deletedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <button onClick={() => onRestore(item.block.id)} style={{
                                            background: '#F3F4F6', border: 'none', borderRadius: '10px',
                                            padding: '6px 12px', fontWeight: 700, fontSize: '0.7rem',
                                            color: '#944a18', cursor: 'pointer', whiteSpace: 'nowrap',
                                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>undo</span> Restaurar
                                        </button>
                                    </div>
                                ))}
                                <button onClick={onClear} style={{
                                    width: '100%', marginTop: '16px', padding: '10px',
                                    borderRadius: '12px', border: 'none', background: '#FEF2F2',
                                    color: '#DC2626', fontWeight: 700, fontSize: '0.8rem',
                                    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}>
                                    Vaciar papelera
                                </button>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
