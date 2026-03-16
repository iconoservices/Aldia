import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onProfileClick: () => void;
}

export const Header = ({ activeTab, setActiveTab, onProfileClick }: HeaderProps) => {
    const { canInstall, install, isInstalled } = usePWA();
    const { user } = useAuth();
    const [profilePic, setProfilePic] = useState<string | null>(null);

    useEffect(() => {
        // Only set local if no firebase user pic
        if (user?.photoURL) {
            setProfilePic(user.photoURL);
        } else {
            const savedPic = localStorage.getItem('aldia_user_pic');
            if (savedPic) setProfilePic(savedPic);
        }

        const handleStorage = () => {
            const updatedPic = localStorage.getItem('aldia_user_pic');
            setProfilePic(updatedPic);
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [user]);

    const allTabs = ['🔥 Acción', '📅 Calendario', '🧠 Cerebro', '🌿 Vida', '📁 Proyectos', '💸 Finanzas', '📊 Stats'];
    const mainTabs = allTabs.slice(0, 6);
    const statsTab = allTabs[6];

    const renderTab = (tab: string, className = "") => {
        const tabValue = tab.split(' ')[1];
        return (
            <button
                key={tab}
                className={`tab-btn ${activeTab === tabValue ? 'active-tab' : ''} ${className}`}
                onClick={() => setActiveTab(tabValue)}
            >
                {tab}
            </button>
        );
    };

    return (
        <header className="aldia-header">
            <div className="tabs-container">
                {mainTabs.map(tab => renderTab(tab))}
                {/* Desktop only Stats */}
                <div className="desktop-only">
                    {renderTab(statsTab)}
                </div>
            </div>

            <div className="header-right">
                <div className="mobile-only stats-mobile-wrapper">
                    {renderTab(statsTab, "stats-mobile-btn")}
                </div>
                {canInstall && !isInstalled && (
                    <button
                        onClick={install}
                        className="install-btn-header"
                        style={{
                            background: 'var(--domain-orange)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '11px',
                            fontSize: '0.7rem',
                            fontWeight: 900,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(255, 140, 66, 0.3)',
                            animation: 'pulse-soft 2s infinite'
                        }}
                    >
                        INSTALAR
                    </button>
                )}

                <div
                    className="profile-pic"
                    onClick={onProfileClick}
                    style={{
                        cursor: 'pointer',
                        background: '#f0f0f0',
                        border: '2px solid var(--domain-orange)',
                        borderRadius: '14px',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        backgroundSize: 'cover',
                        backgroundImage: profilePic ? `url(${profilePic})` : 'none'
                    }}
                >
                    {!profilePic && <User size={20} color="#CCC" />}
                </div>
            </div>
        </header>
    );
};
