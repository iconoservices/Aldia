import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, LogOut, Bell, Moon, User, Shield } from 'lucide-react';

interface ProfileOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileOverlay = ({ isOpen, onClose }: ProfileOverlayProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
                    {/* BACKDROP BLUR */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(253, 248, 245, 0.85)',
                            backdropFilter: 'blur(12px)'
                        }}
                    />

                    {/* CONTENT CARD */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '600px',
                            margin: '4rem auto',
                            background: 'white',
                            borderRadius: '32px',
                            padding: '2.5rem',
                            boxShadow: '0 25px 80px rgba(0,0,0,0.1)',
                            maxHeight: '85vh',
                            overflowY: 'auto'
                        }}
                    >
                        {/* CLOSE BUTTON */}
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute', top: '1.5rem', right: '1.5rem',
                                border: 'none', background: '#f5f5f5', borderRadius: '50%',
                                padding: '12px', cursor: 'pointer', color: '#888'
                            }}
                        >
                            <X size={20} />
                        </button>

                        {/* PROFILE HEADER */}
                        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'var(--domain-orange)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: 800 }}>
                                JD
                            </div>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-carbon)', margin: 0 }}>Juan Diego</h2>
                            <p style={{ color: '#888', fontWeight: 600 }}>Cerebro Digital AlDía v1.0.2</p>
                        </div>

                        {/* SETTINGS GROUPS */}
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div className="settings-group">
                                <h4 style={{ color: '#CCC', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '1rem', fontWeight: 800 }}>Conectividad</h4>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    <button style={settingItemStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Calendar size={20} color="var(--domain-orange)" />
                                            <span>Google Calendar</span>
                                        </div>
                                        <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 800 }}>Conectado</span>
                                    </button>
                                    <button style={settingItemStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Shield size={20} color="var(--domain-blue)" />
                                            <span>Seguridad & Cuenta</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="settings-group">
                                <h4 style={{ color: '#CCC', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '1rem', fontWeight: 800 }}>Personalización</h4>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    <button style={settingItemStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Moon size={20} color="var(--domain-green)" />
                                            <span>Modo Oscuro</span>
                                        </div>
                                        <div style={{ width: '40px', height: '20px', background: '#EEE', borderRadius: '20px' }}></div>
                                    </button>
                                    <button style={settingItemStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Bell size={20} color="var(--domain-orange)" />
                                            <span>Notificaciones</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="settings-group">
                                <h4 style={{ color: '#CCC', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '1rem', fontWeight: 800 }}>General</h4>
                                <button style={{ ...settingItemStyle, color: '#f87171' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <LogOut size={20} />
                                        <span>Cerrar Sesión</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div style={{ marginTop: '3rem', textAlign: 'center', borderTop: '1px solid #F5F5F5', paddingTop: '2rem' }}>
                            <p style={{ color: '#888', fontSize: '0.85rem' }}>Ecosistema Antigravity – 2026</p>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const settingItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    background: '#FAFAFA',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--text-carbon)'
};
