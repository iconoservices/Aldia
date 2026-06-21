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
    const { install, isInstalled } = usePWA();
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


    // ── Primary sidebar items ─────────────────────────────────────────
    const PRIMARY_ITEMS = [
        { label: 'Checklist', tab: 'Checklist', icon: 'task_alt' },
        { label: 'Bloques', tab: 'Bloques',   icon: 'history_edu'    },
        { label: 'Ajustes',  tab: '__profile', icon: 'settings'       },
    ];

    // ── Secondary / all other tools ────────────────────────────────────
    const SECONDARY_ITEMS = [
        { label: 'Acción',     tab: 'Acción',     icon: 'bolt'          },
        { label: 'Calendario', tab: 'Calendario',  icon: 'calendar_today'},
        { label: 'Vida',       tab: 'Vida',        icon: 'spa'           },
        { label: 'Cerebro',    tab: 'Cerebro',     icon: 'psychology'    },
        { label: 'Ruta',       tab: 'Ruta',        icon: 'route'         },
        { label: 'Mapa',       tab: 'Mapa',        icon: 'map'           },
        { label: 'Proyectos',  tab: 'Proyectos',   icon: 'folder'        },
        { label: 'Tablero',    tab: 'Tablero',     icon: 'view_kanban'   },
        { label: 'Lienzo',     tab: 'Lienzo',      icon: 'palette'       },
        { label: 'Datos',      tab: 'Stats',       icon: 'analytics'     },
        { label: 'Finanzas',   tab: 'Finanzas',    icon: 'payments'      },
    ];

    // ── Shared sidebar button renderer ─────────────────────────────────
    const renderSidebarBtn = (item: { label: string; tab: string; icon: string }) => {
        const isActive = item.tab === '__profile' ? false : activeTab === item.tab;
        return (
            <button
                key={item.label}
                onClick={() => {
                    if (item.tab === '__profile') { onProfileClick(); }
                    else { setActiveTab(item.tab); }
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: isActive ? 700 : 500,
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s ease',
                    background: isActive ? '#edeeef' : 'transparent',
                    color: isActive ? '#944a18' : '#54433a',
                    boxShadow: isActive ? 'inset -3px 0 0 #944a18' : 'none',
                }}
                onMouseEnter={e => {
                    if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = '#f3f4f5';
                        (e.currentTarget as HTMLElement).style.color = '#944a18';
                    }
                }}
                onMouseLeave={e => {
                    if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '#54433a';
                    }
                }}
            >
                <span
                    className="material-symbols-outlined"
                    style={{
                        fontSize: '18px',
                        fontVariationSettings: isActive ? "'FILL' 1, 'wght' 600" : "'FILL' 0, 'wght' 400",
                        color: 'inherit',
                        flexShrink: 0,
                    }}
                >
                    {item.icon}
                </span>
                <span>{item.label}</span>
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
            {/* ── Desktop Sidebar ── */}
            <header className="aldia-header desktop-header-only">
                {/* Logo */}
                <div className="sidebar-logo desktop-only" style={{ padding: '0 4px', flexShrink: 0 }}>
                    <div className="logo-placeholder">A</div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#944a18', letterSpacing: '-0.01em', lineHeight: 1 }}>AIDía</h1>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#54433a', opacity: 0.7, fontWeight: 600, letterSpacing: '0.04em' }}>Productivity Focus</p>
                    </div>
                </div>

                {/* Nav Items */}
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', paddingRight: '2px' }}>
                    {/* Primary group */}
                    {PRIMARY_ITEMS.map(item => renderSidebarBtn(item))}

                    {/* Divider */}
                    <div style={{ margin: '10px 0 6px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
                        <span style={{ flex: 1, height: '1px', background: '#e7e8e9' }} />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#877369', letterSpacing: '0.08em', whiteSpace: 'nowrap', opacity: 0.7 }}>
                            HERRAMIENTAS
                        </span>
                        <span style={{ flex: 1, height: '1px', background: '#e7e8e9' }} />
                    </div>

                    {/* Secondary group */}
                    {SECONDARY_ITEMS.map(item => renderSidebarBtn(item))}
                </nav>

                {/* Bottom: Nueva Sesión + Install */}
                <div style={{ borderTop: '1px solid #dac2b6', paddingTop: '12px', flexShrink: 0, display: 'flex', gap: '8px' }}>
                    {!isInstalled && (
                        <button onClick={install} title="Instalar app" style={{
                            background: 'rgba(148,74,24,0.08)', border: 'none', borderRadius: '12px',
                            padding: '0 12px', cursor: 'pointer', color: '#944a18', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
                        </button>
                    )}
                    <button
                        onClick={onProfileClick}
                        style={{
                            flex: 1,
                            background: '#ff9f66',
                            color: '#773401',
                            border: 'none',
                            padding: '12px 16px',
                            borderRadius: '14px',
                            fontSize: '15px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        {profilePic ? (
                            <img
                                src={profilePic}
                                alt="Profile"
                                style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                            />
                        ) : (
                            <User size={18} />
                        )}
                        Nueva Sesión
                    </button>
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
                    {PRIMARY_ITEMS.map(item => renderSidebarBtn(item))}
                    <div style={{ margin: '10px 0 6px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
                        <span style={{ flex: 1, height: '1px', background: '#e7e8e9' }} />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#877369', letterSpacing: '0.08em', whiteSpace: 'nowrap', opacity: 0.7 }}>
                            HERRAMIENTAS
                        </span>
                        <span style={{ flex: 1, height: '1px', background: '#e7e8e9' }} />
                    </div>
                    {SECONDARY_ITEMS.map(item => renderSidebarBtn(item))}
                </div>
            </div>

            {/* ── Mobile Bottom Navigation Bar ── */}
            <div className="mobile-bottom-nav">
                <button 
                    onClick={() => setActiveTab('Checklist')}
                    className={`mobile-nav-btn ${activeTab === 'Checklist' ? 'active' : ''}`}
                >
                    <span className="material-symbols-outlined">task_alt</span>
                    <span>Checklist</span>
                </button>

                <button 
                    onClick={() => setActiveTab('Bloques')}
                    className={`mobile-nav-btn ${activeTab === 'Bloques' ? 'active' : ''}`}
                >
                    <span className="material-symbols-outlined">calendar_view_week</span>
                    <span>Bloques</span>
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
