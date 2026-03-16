import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Download, Share, Camera, User, RefreshCw, Settings, Grid, Shield } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { useAuth } from '../../hooks/useAuth';

interface ProfileOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileOverlay = ({ isOpen, onClose }: ProfileOverlayProps) => {
    const { user, loginWithGoogle, logout, updateProfile, loading: authLoading } = useAuth();
    const { isInstalled, install, canInstall } = usePWA();
    const [showIOSGuide, setShowIOSGuide] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    // Syncing local identity for guest users (simplified)
    const [guestName, setGuestName] = useState(() => localStorage.getItem('aldia_user_name') || 'Usuario AlDía');
    const [guestPic, setGuestPic] = useState(() => localStorage.getItem('aldia_user_pic') || null);

    const handleUpdateName = async () => {
        const newName = prompt('Tu nombre:', user?.displayName || guestName);
        if (!newName) return;

        if (user) {
            setIsUpdating(true);
            try {
                await updateProfile({ displayName: newName });
            } finally {
                setIsUpdating(false);
            }
        } else {
            setGuestName(newName);
            localStorage.setItem('aldia_user_name', newName);
            window.dispatchEvent(new Event('storage'));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                if (user) {
                    setIsUpdating(true);
                    try {
                        await updateProfile({ photoURL: base64String });
                    } finally {
                        setIsUpdating(false);
                    }
                } else {
                    setGuestPic(base64String);
                    localStorage.setItem('aldia_user_pic', base64String);
                    window.dispatchEvent(new Event('storage'));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInstallClick = async () => {
        const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        if (isIOS) setShowIOSGuide(true);
        else await install();
    };

    const displayName = user?.displayName || guestName;
    const photoURL = user?.photoURL || guestPic;

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={overlayBackdropStyle}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={modalContainerStyle}
                    >
                        {/* Header Handle for Mobile feel */}
                        <div style={handleStyle} />

                        <button onClick={onClose} style={closeButtonStyle}><X size={20} /></button>

                        <div style={{ padding: '2rem 1.5rem' }}>
                            {/* Profile Section */}
                            <div style={profileHeaderStyle}>
                                <div style={avatarWrapperStyle}>
                                    <div style={{ ...avatarStyle, backgroundImage: photoURL ? `url(${photoURL})` : 'none' }}>
                                        {!photoURL && <User size={40} color="#AAA" />}
                                        {(authLoading || isUpdating) && (
                                            <div style={avatarOverlayStyle}><RefreshCw size={24} className="spin-slow" color="white" /></div>
                                        )}
                                    </div>
                                    <label style={cameraButtonStyle}>
                                        <Camera size={16} />
                                        <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                                    </label>
                                </div>

                                <h2 onClick={handleUpdateName} style={nameStyle}>{displayName}</h2>
                                <p style={versionStyle}>Mi Mente Digital v1.1.0</p>
                            </div>

                            {/* Action Cards */}
                            <div style={actionGridStyle}>
                                <div onClick={handleUpdateName} style={actionCardStyle}>
                                    <Grid size={20} color="var(--domain-orange)" />
                                    <span>Editar Perfil</span>
                                </div>
                                <div onClick={() => alert('Próximamente...')} style={actionCardStyle}>
                                    <Shield size={20} color="var(--domain-purple)" />
                                    <span>Seguridad</span>
                                </div>
                            </div>

                            {/* Settings List */}
                            <div style={settingsListStyle}>
                                {canInstall && !isInstalled && (
                                    <button onClick={handleInstallClick} style={settingButtonStyle}>
                                        <div style={settingIconWrapper(true)}><Download size={18} /></div>
                                        <span style={{ flex: 1, textAlign: 'left' }}>Instalar App Nativa</span>
                                        <div style={badgeStyle}>NUEVO</div>
                                    </button>
                                )}

                                {!user ? (
                                    <button onClick={loginWithGoogle} style={settingButtonStyle}>
                                        <div style={settingIconWrapper()}><User size={18} /></div>
                                        <span style={{ flex: 1, textAlign: 'left' }}>Conectar Google Cloud</span>
                                    </button>
                                ) : (
                                    <div style={activeSessionStyle}>
                                        <div style={settingIconWrapper(false, true)}><Shield size={18} /></div>
                                        <div style={{ flex: 1 }}>
                                            <p style={sessionTitleStyle}>Google Sync Activo</p>
                                            <p style={sessionEmailStyle}>{user.email}</p>
                                        </div>
                                    </div>
                                )}

                                <button onClick={() => alert('Próximamente')} style={settingButtonStyle}>
                                    <div style={settingIconWrapper()}><Settings size={18} /></div>
                                    <span style={{ flex: 1, textAlign: 'left' }}>Preferencias</span>
                                </button>

                                <div style={{ marginTop: '1rem', borderTop: '1px solid #EEE', paddingTop: '1rem' }}>
                                    <button onClick={user ? logout : () => {
                                        if(confirm("¿Borrar caché local?")) {
                                            localStorage.clear();
                                            window.location.reload();
                                        }
                                    }} style={{ ...settingButtonStyle, color: '#f87171' }}>
                                        <div style={{ ...settingIconWrapper(), background: '#FEF2F2', color: '#f87171' }}><LogOut size={18} /></div>
                                        <span style={{ flex: 1, textAlign: 'left' }}>{user ? 'Cerrar Sesión' : 'Limpiar Datos'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            <AnimatePresence>
                {showIOSGuide && (
                    <div style={iosOverlayStyle}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={iosModalStyle}>
                            <span style={{ fontSize: '3rem' }}>🍎</span>
                            <h2 style={iosTitleStyle}>Instalar en iPhone</h2>
                            <p style={iosTextStyle}>Para llevar **AlDía** en tu pantalla de inicio:</p>
                            <div style={guideBoxStyle}>
                                <div style={guideItemStyle}>
                                    <div style={numberCircleStyle}>1</div>
                                    <p style={{ margin: 0 }}>Toca <b>Compartir</b> <Share size={18} style={{ verticalAlign: 'middle' }} />.</p>
                                </div>
                                <div style={guideItemStyle}>
                                    <div style={numberCircleStyle}>2</div>
                                    <p style={{ margin: 0 }}>Elige <b>"Agregar a inicio"</b> (+).</p>
                                </div>
                            </div>
                            <button onClick={() => setShowIOSGuide(false)} style={closeIOSButtonStyle}>¡ENTENDIDO!</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </AnimatePresence>
    );
};

// Styles
const overlayBackdropStyle: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)' };
const modalContainerStyle: React.CSSProperties = { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white', borderRadius: '40px 40px 0 0', boxShadow: '0 -20px 60px rgba(0,0,0,0.1)', maxWidth: '500px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto' };
const handleStyle: React.CSSProperties = { width: '40px', height: '4px', background: '#DDD', borderRadius: '2px', margin: '0.8rem auto 0' };
const closeButtonStyle: React.CSSProperties = { position: 'absolute', top: '1.2rem', right: '1.2rem', border: 'none', background: '#F5F5F5', padding: '10px', borderRadius: '50%', cursor: 'pointer', color: '#666' };
const profileHeaderStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '2rem' };
const avatarWrapperStyle: React.CSSProperties = { position: 'relative', width: '100px', height: '100px', margin: '0 auto 1.2rem' };
const avatarStyle: React.CSSProperties = { width: '100%', height: '100%', borderRadius: '35%', background: '#F9F9F9', border: '3px solid var(--domain-orange)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
const avatarOverlayStyle: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const cameraButtonStyle: React.CSSProperties = { position: 'absolute', bottom: '-5px', right: '-5px', background: 'var(--domain-orange)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex' };
const nameStyle: React.CSSProperties = { fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-carbon)', margin: 0, cursor: 'pointer' };
const versionStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 750, color: '#AAA', marginTop: '4px' };
const actionGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' };
const actionCardStyle: React.CSSProperties = { background: '#FDF8F5', padding: '1.2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem' };
const settingsListStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.5rem' };
const settingButtonStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'transparent', border: 'none', width: '100%', cursor: 'pointer', fontSize: '1rem', fontWeight: 750, color: 'var(--text-carbon)', borderRadius: '16px', transition: 'background 0.2s' };
const settingIconWrapper = (orange = false, green = false): React.CSSProperties => ({ width: '40px', height: '40px', borderRadius: '12px', background: orange ? '#FFF7ED' : (green ? '#F0FDF4' : '#F5F5F5'), color: orange ? 'var(--domain-orange)' : (green ? 'var(--domain-green)' : '#666'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 });
const badgeStyle: React.CSSProperties = { background: 'var(--domain-orange)', color: 'white', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 900 };
const activeSessionStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0' };
const sessionTitleStyle: React.CSSProperties = { fontSize: '0.9rem', fontWeight: 800, margin: 0, color: 'var(--domain-green)' };
const sessionEmailStyle: React.CSSProperties = { fontSize: '0.75rem', color: '#666', margin: 0, fontWeight: 600 };
const iosOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,0.4)' };
const iosModalStyle: React.CSSProperties = { background: 'white', maxWidth: '360px', width: '100%', borderRadius: '40px', padding: '2.5rem 2rem', textAlign: 'center' };
const iosTitleStyle: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' };
const iosTextStyle: React.CSSProperties = { fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' };
const guideBoxStyle: React.CSSProperties = { textAlign: 'left', background: '#F9F9F9', padding: '1.5rem', borderRadius: '24px', marginBottom: '1.5rem' };
const guideItemStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.8rem' };
const numberCircleStyle: React.CSSProperties = { width: '22px', height: '22px', borderRadius: '50%', background: 'var(--domain-orange)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 };
const closeIOSButtonStyle: React.CSSProperties = { width: '100%', padding: '1rem', borderRadius: '16px', background: 'var(--text-carbon)', color: 'white', border: 'none', fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' };
