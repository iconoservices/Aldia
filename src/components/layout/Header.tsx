import { Download } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

interface HeaderProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onProfileClick: () => void;
}

export const Header = ({ activeTab, setActiveTab, onProfileClick }: HeaderProps) => {
    const { canInstall, install, isInstalled } = usePWA();

    return (
        <header className="aldia-header">
            <div className="header-left">
                {/* Logo principal alineado a la izquierda */}
                <img
                    src="/logo.png"
                    alt="AlDia Logo"
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '14px', // Squircle moderno en lugar de círculo para no recortar esquinas
                        objectFit: 'contain',
                        background: '#fff'
                    }}
                />
            </div>

            <div className="tabs-container">
                {['🔥 Acción', '🌿 Vida', '💸 Finanzas', '🧠 Stats'].map((tab) => {
                    const tabValue = tab.split(' ')[1];
                    return (
                        <button
                            key={tab}
                            className={`tab-btn ${activeTab === tabValue ? 'active-tab' : ''}`}
                            onClick={() => setActiveTab(tabValue)}
                        >
                            {tab}
                        </button>
                    );
                })}
            </div>

            <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Botón de instalación dinámico */}
                {canInstall && !isInstalled && (
                    <button
                        onClick={install}
                        className="install-btn-header"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--domain-orange)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(255, 140, 66, 0.3)',
                            animation: 'pulse-soft 2s infinite'
                        }}
                    >
                        <Download size={14} />
                        INSTALAR
                    </button>
                )}

                <div
                    className="profile-pic"
                    onClick={onProfileClick}
                    style={{
                        cursor: 'pointer',
                        background: 'white',
                        border: '2px solid var(--domain-orange)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderRadius: '12px', // Consistente con el logo
                        width: '40px',
                        height: '40px'
                    }}
                >
                    <img src="/logo.png" alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            </div>
        </header>
    );
};
