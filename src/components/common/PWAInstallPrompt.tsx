import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share } from 'lucide-react';

interface PWAStats {
    visitCount: number;
    lastVisit: number;
    isInstalled: boolean;
}

export const PWAInstallPrompt = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    // Recuperar o inicializar estadísticas
    const getStats = (): PWAStats => {
        const saved = localStorage.getItem('aldia_pwa_stats');
        if (saved) return JSON.parse(saved);
        return { visitCount: 0, lastVisit: Date.now(), isInstalled: false };
    };

    const saveStats = (stats: PWAStats) => {
        localStorage.setItem('aldia_pwa_stats', JSON.stringify(stats));
    };

    useEffect(() => {
        // 1. Detectar si ya es PWA
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        if (isPWA) {
            return;
        }

        // 2. Determinar si es iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const iosMatch = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(iosMatch);

        const stats = getStats();
        const now = Date.now();

        // Actualizar estadísticas de visita
        const newStats: PWAStats = {
            visitCount: stats.visitCount + 1,
            lastVisit: now,
            isInstalled: false
        };
        saveStats(newStats);

        const triggerBanner = () => {
            if (!showIOSGuide) setShowBanner(true);
        };

        // Lógica de aparición (Appearing after 3s on first visit, or periodically)
        if (newStats.visitCount === 1) {
            setTimeout(triggerBanner, 3000);
        } else if (newStats.visitCount % 3 === 0) {
            setTimeout(triggerBanner, 5000);
        }

        const handler = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        if (!iosMatch) {
            window.addEventListener('beforeinstallprompt', handler);
        }

        window.addEventListener('appinstalled', () => {
            setShowBanner(false);
            const finalStats = getStats();
            finalStats.isInstalled = true;
            saveStats(finalStats);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [showIOSGuide]);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSGuide(true);
            setShowBanner(false);
        } else if (installPrompt) {
            installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            if (outcome === 'accepted') setShowBanner(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {showBanner && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        style={bannerStyle}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={iconBoxStyle}>
                                <img src="/logo.png" alt="Logo" style={{ width: '24px', height: '24px' }} />
                            </div>
                            <div>
                                <p style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: '#333' }}>Instala AlDía App</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#888', fontWeight: 600 }}>Tu cerebro digital siempre listo</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button onClick={() => setShowBanner(false)} style={laterBtnStyle}>AHORA NO</button>
                            <button onClick={handleInstallClick} style={installBtnStyle}>
                                <Download size={16} />
                                INSTALAR
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showIOSGuide && (
                    <div style={overlayStyle}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={modalStyle}
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
        </>
    );
};

const bannerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: '500px',
    background: 'white',
    borderRadius: '24px',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
    zIndex: 5000,
    border: '1px solid #f0f0f0'
};

const iconBoxStyle: React.CSSProperties = {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    background: '#FFF5EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(255, 140, 66, 0.1)'
};

const installBtnStyle: React.CSSProperties = {
    background: 'var(--domain-orange)',
    color: 'white',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '14px',
    fontSize: '0.8rem',
    fontWeight: 900,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(255, 140, 66, 0.3)'
};

const laterBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#AAA',
    fontSize: '0.75rem',
    fontWeight: 800,
    cursor: 'pointer',
    padding: '8px'
};

const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    background: 'rgba(253, 248, 245, 0.8)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
};

const modalStyle: React.CSSProperties = {
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
