import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, LogOut, Edit2, Download, Share, Camera, User } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

interface ProfileOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileOverlay = ({ isOpen, onClose }: ProfileOverlayProps) => {
    const [name, setName] = useState('Juan Diego');
    const [isEditing, setIsEditing] = useState(false);
    const { isInstalled, install, canInstall } = usePWA();
    const [showIOSGuide, setShowIOSGuide] = useState(false);
    const [profilePic, setProfilePic] = useState<string | null>(null);

    useEffect(() => {
        const savedName = localStorage.getItem('aldia_user_name');
        if (savedName) setName(savedName);

        const savedPic = localStorage.getItem('aldia_user_pic');
        if (savedPic) setProfilePic(savedPic);
    }, []);

    const handleSaveName = () => {
        localStorage.setItem('aldia_user_name', name);
        setIsEditing(false);
        window.dispatchEvent(new Event('storage'));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setProfilePic(base64String);
                localStorage.setItem('aldia_user_pic', base64String);
                window.dispatchEvent(new Event('storage'));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInstallClick = async () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);
        if (isIOS) {
            setShowIOSGuide(true);
        } else {
            await install();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
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

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        style={{
                            position: 'relative',
                            width: '90%',
                            maxWidth: '600px',
                            margin: '4rem auto',
                            background: 'white',
                            borderRadius: '35px',
                            padding: '2.5rem',
                            boxShadow: '0 25px 80px rgba(0,0,0,0.1)',
                            maxHeight: '85vh',
                            overflowY: 'auto'
                        }}
                    >
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

                        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                            <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 1.5rem' }}>
                                <div style={{
                                    width: '100%', height: '100%', borderRadius: '35%',
                                    background: '#f0f0f0', border: '4px solid var(--domain-orange)',
                                    overflow: 'hidden', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', backgroundSize: 'cover',
                                    backgroundImage: profilePic ? `url(${profilePic})` : 'none'
                                }}>
                                    {!profilePic && <User size={50} color="#CCC" />}
                                </div>
                                <label style={{
                                    position: 'absolute', bottom: '-5px', right: '-5px',
                                    background: 'var(--domain-orange)', color: 'white',
                                    padding: '8px', borderRadius: '50%', cursor: 'pointer',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)', display: 'flex'
                                }}>
                                    <Camera size={18} />
                                    <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                                </label>
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
                                            fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-carbon)',
                                            border: 'none', borderBottom: '2px solid var(--domain-orange)',
                                            textAlign: 'center', outline: 'none', width: 'auto',
                                        }}
                                    />
                                ) : (
                                    <>
                                        <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-carbon)', margin: 0 }}>{name}</h2>
                                        <button onClick={() => setIsEditing(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#CCC' }}>
                                            <Edit2 size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                            <p style={{ color: '#888', fontWeight: '600' }}>Mi Cerebro Digital v1.1.0</p>
                        </div>

                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            {canInstall && !isInstalled && (
                                <div className="settings-group">
                                    <h4 style={{ color: '#CCC', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '10px' }}>App Nativa</h4>
                                    <button onClick={handleInstallClick} style={{ ...settingItemStyle, background: 'var(--domain-orange)', color: 'white' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Download size={20} />
                                            <span>Instalar AlDía</span>
                                        </div>
                                    </button>
                                </div>
                            )}

                            <div className="settings-group">
                                <h4 style={{ color: '#CCC', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '10px' }}>Conectividad</h4>
                                <div style={{ display: 'grid', gap: '0.8rem' }}>
                                    <button style={settingItemStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Calendar size={20} color="var(--domain-orange)" />
                                            <span>Sincronizar con Google</span>
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: '#888' }}>PRÓXIMAMENTE</span>
                                    </button>
                                </div>
                            </div>

                            <div className="settings-group">
                                <h4 style={{ color: '#CCC', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '10px' }}>General</h4>
                                <button style={{ ...settingItemStyle, color: '#f87171' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <LogOut size={20} />
                                        <span>Cerrar Sesión local</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

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
                            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', margin: '1rem 0', color: 'var(--domain-orange)' }}>Instalar en iPhone</h2>
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
    padding: '1.2rem',
    background: '#F9F9F9',
    border: 'none',
    borderRadius: '18px',
    cursor: 'pointer',
    width: '100%',
    fontWeight: '700',
    fontSize: '0.9rem',
    color: 'var(--text-carbon)'
};

const iosOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(253, 248, 245, 0.95)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
const iosModalStyle: React.CSSProperties = { background: 'white', maxWidth: '360px', width: '100%', borderRadius: '40px', padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 30px 70px rgba(0,0,0,0.15)' };
const guideBoxStyle: React.CSSProperties = { textAlign: 'left', background: '#F9F9F9', padding: '1.5rem', borderRadius: '24px', marginBottom: '2rem' };
const guideItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '1rem' };
const numberCircleStyle: React.CSSProperties = { width: '24px', height: '24px', borderRadius: '50%', background: 'var(--domain-orange)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', flexShrink: 0, marginTop: '2px' };
const closeBtnStyle: React.CSSProperties = { width: '100%', padding: '1rem', borderRadius: '18px', background: 'var(--text-carbon)', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' };
