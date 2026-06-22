import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog = ({ open, title, message, confirmLabel = 'Eliminar', cancelLabel = 'Cancelar', onConfirm, onCancel }: ConfirmDialogProps) => {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                        padding: '20px',
                    }}
                    onClick={onCancel}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'white', borderRadius: '24px', padding: '24px',
                            width: '100%', maxWidth: '340px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                        }}
                    >
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '16px',
                            background: '#FEF2F2', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', marginBottom: '16px',
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#DC2626' }}>delete</span>
                        </div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 800, color: '#191c1d' }}>
                            {title}
                        </h3>
                        <p style={{ margin: '0 0 24px', fontSize: '0.9rem', fontWeight: 500, color: '#877369', lineHeight: 1.5 }}>
                            {message}
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={onCancel}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '14px', border: '2px solid #E5E7EB',
                                    background: 'white', color: '#54433a', fontWeight: 800, fontSize: '0.85rem',
                                    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={onConfirm}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '14px', border: 'none',
                                    background: '#DC2626', color: 'white', fontWeight: 800, fontSize: '0.85rem',
                                    cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
