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
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
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

    const TAB_ICONS: Record<string, string> = {
        'Checklist': 'checklist',
        'Acción': 'bolt',
        'Calendario': 'calendar_today',
        'Bloques': 'calendar_view_week',
        'Ruta': 'route',
        'Mapa': 'map',
        'Cerebro': 'psychology',
        'Vida': 'spa',
        'Proyectos': 'folder',
        'Tablero': 'view_kanban',
        'Lienzo': 'palette',
        'Finanzas': 'payments',
        'Stats': 'analytics'
    };

    const allTabs = [
        'Checklist', 'Bloques', 'Calendario', 
        'Ruta', 'Mapa', 'Cerebro', 'Vida', 
        'Proyectos', 'Tablero', 'Lienzo', 'Finanzas', 'Stats', 'Acción'
    ];
    const mainTabs = allTabs.slice(0, 11);
    const statsTab = allTabs[11];

    const renderTab = (tab: string, className = "") => {
        const iconName = TAB_ICONS[tab] || 'star';
        return (
            <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active-tab' : ''} ${className}`}
                onClick={() => {
                    setActiveTab(tab);
                    setIsDrawerOpen(false);
                }}
            >
                <span className="material-symbols-outlined tab-icon" style={{ fontSize: '18px', transition: 'color 0.15s' }}>
                    {iconName}
                </span>
                <span className="tab-label">{tab}</span>
            </button>
        );
    };

    // Map active tab to a friendly title for mobile header
    const getViewTitle = (tab: string) => {
        switch (tab) {
            case 'Checklist': return 'Checklist Diario';
            case 'Bloques': return 'Registro Semanal';
            case 'Acción': return 'Mi Acción';
            case 'Calendario': return 'Calendario';
            case 'Stats': return 'Estadísticas';
            case 'Finanzas': return 'Finanzas';
            case 'Cerebro': return 'Cerebro';
            case 'Vida': return 'Mi Vida';
            case 'Proyectos': return 'Proyectos';
            case 'Tablero': return 'Tablero Kanban';
            case 'Lienzo': return 'Lienzo';
            case 'Ruta': return 'Mi Ruta';
            case 'Mapa': return 'Mapa';
            default: return tab;
        }
    };

    return (
        <>
            {/* ── Desktop Header ── */}
            <header className="aldia-header desktop-header-only">
                <div className="sidebar-logo desktop-only">
                    <div className="logo-placeholder">A</div>
                    <span className="logo-text">AlDía</span>
                </div>

                <div className="tabs-container">
                    {mainTabs.map(tab => renderTab(tab))}
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

            {/* ── Mobile Header Bar ── */}
            <div className="mobile-header-bar">
                <button className="mobile-menu-trigger" onClick={() => setIsDrawerOpen(true)}>
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <div className="mobile-title-container">
                    <span className="mobile-logo-text">AIDía</span>
                    <span className="mobile-view-title">{getViewTitle(activeTab)}</span>
                </div>
                <div 
                    className="mobile-profile-trigger" 
                    onClick={onProfileClick}
                    style={{
                        backgroundImage: profilePic ? `url(${profilePic})` : 'none'
                    }}
                >
                    {!profilePic && <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#888' }}>person</span>}
                </div>
            </div>

            {/* ── Mobile Slide-out Drawer ── */}
            <div 
                className={`mobile-drawer-backdrop ${isDrawerOpen ? 'open' : ''}`} 
                onClick={() => setIsDrawerOpen(false)}
            />
            <div className={`mobile-drawer ${isDrawerOpen ? 'open' : ''}`}>
                <div className="mobile-drawer-header">
                    <div>
                        <span className="mobile-logo-text" style={{ fontSize: '1.4rem' }}>AIDía</span>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#877369', fontWeight: 600 }}>Productivity Focus</p>
                    </div>
                    <button className="mobile-drawer-close" onClick={() => setIsDrawerOpen(false)}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="mobile-drawer-tabs">
                    {allTabs.map(tab => renderTab(tab, "mobile-drawer-tab-btn"))}
                </div>
            </div>

            {/* ── Mobile Bottom Navigation Bar ── */}
            <div className="mobile-bottom-nav">
                <button 
                    onClick={() => setActiveTab('Checklist')}
                    className={`mobile-nav-btn ${activeTab === 'Checklist' ? 'active' : ''}`}
                >
                    <span className="material-symbols-outlined">task_alt</span>
                    <span>Jornada</span>
                </button>

                <button 
                    onClick={() => setActiveTab('Bloques')}
                    className={`mobile-nav-btn ${activeTab === 'Bloques' ? 'active' : ''}`}
                >
                    <span className="material-symbols-outlined">calendar_view_week</span>
                    <span>Registro</span>
                </button>

                <button 
                    onClick={() => setActiveTab('Stats')}
                    className={`mobile-nav-btn ${activeTab === 'Stats' ? 'active' : ''}`}
                >
                    <span className="material-symbols-outlined">analytics</span>
                    <span>Datos</span>
                </button>

                <button 
                    onClick={onProfileClick}
                    className="mobile-nav-btn"
                >
                    <span className="material-symbols-outlined">settings</span>
                    <span>Ajustes</span>
                </button>
            </div>

            {/* ── Responsive Mobile Navigation CSS ── */}
            <style>{`
                /* Default / Desktop Hiding rules */
                .mobile-header-bar,
                .mobile-bottom-nav,
                .mobile-drawer,
                .mobile-drawer-backdrop {
                    display: none;
                }

                @media (max-width: 768px) {
                    .desktop-header-only {
                        display: none !important;
                    }

                    /* Mobile Header */
                    .mobile-header-bar {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0 16px;
                        height: 60px;
                        background: #f8f9fa;
                        border-bottom: 1px solid #edeeef;
                        position: sticky;
                        top: 0;
                        z-index: 100;
                    }

                    .mobile-menu-trigger {
                        background: none;
                        border: none;
                        cursor: pointer;
                        color: #191c1d;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 6px;
                        border-radius: 8px;
                    }

                    .mobile-title-container {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .mobile-logo-text {
                        font-family: 'Plus Jakarta Sans', sans-serif;
                        font-weight: 800;
                        font-size: 1.25rem;
                        color: #944a18;
                    }

                    .mobile-view-title {
                        font-family: 'Plus Jakarta Sans', sans-serif;
                        font-weight: 700;
                        font-size: 1.05rem;
                        color: #191c1d;
                        border-left: 1px solid #dac2b6;
                        padding-left: 10px;
                    }

                    .mobile-profile-trigger {
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        background-color: #edeeef;
                        background-size: cover;
                        background-position: center;
                        border: 2px solid #ff9f66;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        overflow: hidden;
                    }

                    /* Mobile Bottom Nav */
                    .mobile-bottom-nav {
                        display: flex;
                        justify-content: space-around;
                        align-items: center;
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: 68px;
                        background: #ffffff;
                        border-top: 1px solid #edeeef;
                        z-index: 999;
                        box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.04);
                        padding: 0 8px;
                    }

                    .mobile-nav-btn {
                        background: none;
                        border: none;
                        cursor: pointer;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 2px;
                        color: #54433a;
                        font-family: 'Plus Jakarta Sans', sans-serif;
                        font-size: 0.72rem;
                        font-weight: 600;
                        padding: 6px 12px;
                        border-radius: 16px;
                        min-width: 68px;
                        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    .mobile-nav-btn span.material-symbols-outlined {
                        font-size: 22px;
                        font-variation-settings: 'FILL' 0, 'wght' 500;
                        transition: transform 0.2s;
                    }

                    .mobile-nav-btn.active {
                        background: rgba(148, 74, 24, 0.1);
                        color: #944a18;
                    }

                    .mobile-nav-btn.active span.material-symbols-outlined {
                        font-variation-settings: 'FILL' 1, 'wght' 600;
                        transform: scale(1.08);
                    }

                    /* Mobile Drawer */
                    .mobile-drawer-backdrop {
                        display: block;
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(25, 28, 29, 0.4);
                        backdrop-filter: blur(2px);
                        z-index: 1000;
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.3s ease;
                    }

                    .mobile-drawer-backdrop.open {
                        opacity: 1;
                        pointer-events: auto;
                    }

                    .mobile-drawer {
                        display: flex;
                        flex-direction: column;
                        position: fixed;
                        top: 0;
                        left: 0;
                        bottom: 0;
                        width: 290px;
                        background: #ffffff;
                        z-index: 1001;
                        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.08);
                        transform: translateX(-100%);
                        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        padding: 20px 16px;
                    }

                    .mobile-drawer.open {
                        transform: translateX(0);
                    }

                    .mobile-drawer-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 24px;
                        padding-bottom: 12px;
                        border-bottom: 1px solid #edeeef;
                    }

                    .mobile-drawer-close {
                        background: none;
                        border: none;
                        color: #54433a;
                        cursor: pointer;
                        padding: 4px;
                        display: flex;
                        align-items: center;
                    }

                    .mobile-drawer-tabs {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        overflow-y: auto;
                        flex: 1;
                        padding-right: 4px;
                    }

                    .mobile-drawer-tab-btn {
                        width: 100% !important;
                        text-align: left !important;
                        justify-content: flex-start !important;
                        padding: 12px 16px !important;
                        font-size: 0.9rem !important;
                        font-weight: 700 !important;
                        border-radius: 12px !important;
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 12px !important;
                        color: #54433a !important;
                        background: transparent !important;
                        transition: all 0.2s;
                    }

                    .mobile-drawer-tab-btn.active-tab {
                        background: rgba(148, 74, 24, 0.08) !important;
                        color: #944a18 !important;
                    }
                }
            `}</style>
        </>
    );
};
