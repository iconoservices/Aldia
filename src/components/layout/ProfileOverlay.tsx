import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, LogOut, Bell, Moon, Shield, Edit2, Download, Share } from 'lucide-react';

interface ProfileOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileOverlay = ({ isOpen, onClose }: ProfileOverlayProps) => {
    const [name, setName] = useState('Juan Diego');
    const [isEditing, setIsEditing] = useState(false);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isPWAInstalled, setIsPWAInstalled] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    useEffect(() => {
        const savedName = localStorage.getItem('aldia_user_name');
        if (savedName) setName(savedName);

        // Detectar si ya es PWA
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        setIsPWAInstalled(isPWA);

        // Capturar prompt de instalación (Chrome/Android/PC)
        const handler = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        window.addEventListener('appinstalled', () => {
            setIsPWAInstalled(true);
            setInstallPrompt(null);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleSaveName = () => {
        localStorage.setItem('aldia_user_name', name);
        setIsEditing(false);
        // Disparar evento para que Header lo sepa
        window.dispatchEvent(new Event('storage'));
    };

    const handleInstallClick = async () => {
        // Detectar si es iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);

        if (isIOS) {
            setShowIOSGuide(true);
        } else if (installPrompt) {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') {
                setInstallPrompt(null);
                setIsPWAInstalled(true);
            }
        }
    };



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
                            <div style={{
                                width: '90px', height: '90px', borderRadius: '50%',
                                background: 'white', margin: '0 auto 1rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '4px solid var(--domain-orange)', overflow: 'hidden',
                                boxShadow: '0 10px 25px rgba(255, 140, 66, 0.3)'
                            }}>
                                <img src="/logo.png" alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                {isEditing ? (
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onBlur={handleSaveName}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                                        autoFocus
                                        style={{
                                            fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-carbon)',
                                            border: 'none', borderBottom: '2px solid var(--domain-orange)',
                                            textAlign: 'center', outline: 'none', width: 'auto',
                                            padding: '0 8px'
                                        }}
                                    />
                                ) : (
                                    <>
                                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-carbon)', margin: 0 }}>{name}</h2>
                                        <button onClick={() => setIsEditing(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#CCC' }}>
                                            <Edit2 size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                            <p style={{ color: '#888', fontWeight: 600, marginTop: '4px' }}>Cerebro Digital AlDía v1.0.2</p>
                        </div>

                        {/* SETTINGS GROUPS */}
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {/* INSTALACIÓN PWA (BOTÓN FIJO EN PERFIL) */}
                            {!isPWAInstalled && (
                                <div className="settings-group">
                                    <h4 style={{ color: '#CCC', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '1rem', fontWeight: 800 }}>App Nativa</h4>
                                    <button
                                        onClick={handleInstallClick}
                                        style={{ ...settingItemStyle, background: 'linear-gradient(135deg, #FFF5EB 0%, #FFFFFF 100%)', border: '2px solid var(--domain-orange)' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Download size={20} color="var(--domain-orange)" />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 900 }}>Instalar AlDía</span>
                                                <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Acceso rápido y modo offline</span>
                                            </div>
                                        </div>
                                        <span style={{ background: 'var(--domain-orange)', color: 'white', padding: '4px 12px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900 }}>GRATIS</span>
                                    </button>
                                </div>
                            )}

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

            {/* GUÍA iOS DENTRO DEL PERFIL SI SE NECESITA */}
            <AnimatePresence>
                {showIOSGuide && (
                    <div style={iosOverlayStyle}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={iosModalStyle}
                        >
                            <span style={{ fontSize: '3rem' }}>🍎</span>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '1rem 0', color: 'var(--domain-orange)' }}>Instalar en iPhone</h2>
                            <p style={{ fontSize: '0.95rem', color: '#666', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                                Para llevar **AlDía** en tu pantalla de inicio:
                            </p>
                            <div style={guideBoxStyle}>
                                <div style={guideItemStyle}>
                                    <div style={numberCircleStyle}>1</div>
                                    <p style={{ margin: 0 }}>Toca el icono <b>Compartir</b> <Share size={18} style={{ verticalAlign: 'middle', margin: '0 4px', display: 'inline' }} /> abajo.</p>
                                </div>
                                <div style={guideItemStyle}>
                                    <div style={numberCircleStyle}>2</div>
                                    <p style={{ margin: 0 }}>Elige <b>"Agregar a inicio"</b> (+).</p>
                                </div>
                            </div>
                            <button onClick={() => setShowIOSGuide(false)} style={closeBtnStyle}>¡ENTENDIDO! 🚀</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
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

const iosOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: 'rgba(253, 248, 245, 0.95)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
};

const iosModalStyle: React.CSSProperties = {
    background: 'white',
    maxWidth: '360px',
    width: '100%',
    borderRadius: '40px',
    padding: '3rem 2rem',
    textAlign: 'center',
    boxShadow: '0 30px 70px rgba(0,0,0,0.15)'
};

const guideBoxStyle: React.CSSProperties = {
    textAlign: 'left',
    background: '#F9F9F9',
    padding: '1.5rem',
    borderRadius: '24px',
    marginBottom: '2rem'
};

const guideItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '1rem'
};

const numberCircleStyle: React.CSSProperties = {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'var(--domain-orange)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 800,
    flexShrink: 0,
    marginTop: '2px'
};

const closeBtnStyle: React.CSSProperties = {
    width: '100%',
    padding: '1rem',
    borderRadius: '18px',
    background: 'var(--text-carbon)',
    color: 'white',
    fontWeight: 900,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
};
