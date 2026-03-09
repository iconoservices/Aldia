import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

interface HeaderProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onProfileClick: () => void;
}

export const Header = ({ activeTab, setActiveTab, onProfileClick }: HeaderProps) => {
    const { canInstall, install, isInstalled } = usePWA();
    const [profilePic, setProfilePic] = useState<string | null>(null);

    useEffect(() => {
        const savedPic = localStorage.getItem('aldia_user_pic');
        if (savedPic) setProfilePic(savedPic);

        const handleStorage = () => {
            const updatedPic = localStorage.getItem('aldia_user_pic');
            setProfilePic(updatedPic);
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    return (
        <header className="aldia-header">
            <div className="header-left">
                <img
                    src="/logo.png"
                    alt="AlDia Logo"
                    style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        objectFit: 'contain'
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
