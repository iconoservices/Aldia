import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onProfileClick: () => void;
    onTrashClick: () => void;
}

export const Header = ({ activeTab, setActiveTab, onProfileClick, onTrashClick }: HeaderProps) => {
    const { install, isInstalled } = usePWA();
    const { user } = useAuth();
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isMoreOpen, setIsMoreOpen] = useState(false);

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
        { label: 'Bandeja', tab: 'Bandeja', icon: 'inbox' },
        { label: 'Calendario', tab: 'Calendario',  icon: 'calendar_today'},
        { label: 'Agenda', tab: 'Agenda', icon: 'event' },
        { label: 'Entregas', tab: 'Entregas', icon: 'local_fire_department' },
        { label: 'Finanzas',  tab: 'Finanzas',  icon: 'payments'      },
        { label: 'Fijos', tab: 'Plan',      icon: 'savings'       },
        { label: 'Deudas',     tab: 'Deudas',     icon: 'receipt_long'  },
        { label: 'Proyección',   tab: 'Proyección',  icon: 'trending_up' },
        { label: 'Movimientos', tab: 'Movimientos', icon: 'list_alt'    },
        { label: 'Pendientes', tab: 'Pendientes', icon: 'checklist' },
        { label: 'Vida',       tab: 'Vida',        icon: 'spa'           },
        { label: 'Listas',    tab: 'Listas',    icon: 'fact_check'    },
        { label: 'Compras',   tab: 'Compras',   icon: 'shopping_cart' },
        { label: 'Comidas',   tab: 'Comidas',   icon: 'restaurant'    },
        { label: 'Metas',     tab: 'Metas',     icon: 'flag'          },
        { label: 'Proyectos',  tab: 'Proyectos',   icon: 'folder'        },
        { label: 'Notion', tab: 'Notion', icon: 'sync_alt' },
    ];

    // ── Barra inferior (móvil): 5 accesos rápidos + "Más" ──────────────
    const BOTTOM_TABS = ['Checklist', 'Bandeja', 'Pendientes', 'Calendario', 'Finanzas'];

    // ── Secondary / all other tools ────────────────────────────────────
    const SECONDARY_ITEMS = [
        { label: 'Tranqueo de Vida', tab: 'Tranqueo de Vida', icon: 'self_improvement' },
        { label: 'Buscador',   tab: 'Buscador',   icon: 'travel_explore' },
        { label: 'Acción',     tab: 'Acción',     icon: 'bolt'          },
        { label: 'Base de Datos', tab: 'Base de Datos', icon: 'database' },
        { label: 'Cerebro',    tab: 'Cerebro',     icon: 'psychology'    },
        { label: 'Ruta',       tab: 'Ruta',        icon: 'route'         },
        { label: 'Mapa',       tab: 'Mapa',        icon: 'map'           },
        { label: 'Tablero',    tab: 'Tablero',     icon: 'view_kanban'   },
        { label: 'Lienzo',     tab: 'Lienzo',      icon: 'palette'       },
        { label: 'Lienzo Ops', tab: 'Lienzo Ops',  icon: 'dashboard'     },
        { label: 'Negocio',    tab: 'Negocio',      icon: 'storefront'    },
        { label: 'Rendimiento', tab: 'Rendimiento', icon: 'monitoring'   },
        { label: 'Datos',      tab: 'Stats',       icon: 'analytics'     },
        { label: 'Bienestar',  tab: 'Bienestar',   icon: 'favorite'      },
    ];

    // ── Shared sidebar button renderer ─────────────────────────────────
    const renderSidebarBtn = (item: { label: string; tab: string; icon: string }) => {
        const isActive = item.tab === '__profile' ? false : activeTab === item.tab;
        return (
            <button
                key={item.tab}
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
                    background: isActive ? '#EDF3F0' : 'transparent',
                    color: isActive ? '#0FA97A' : '#4A5F58',
                    boxShadow: isActive ? 'inset -3px 0 0 #0FA97A' : 'none',
                }}
                onMouseEnter={e => {
                    if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = '#F7FAF8';
                        (e.currentTarget as HTMLElement).style.color = '#0FA97A';
                    }
                }}
                onMouseLeave={e => {
                    if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '#4A5F58';
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
            case 'Bandeja': return 'Bandeja';
            case 'Pendientes': return 'Pendientes';
            case 'Plan': return 'Ingresos y Gastos Fijos';
            case 'Compras': return 'Lista de Compras & Deseos';
            case 'Comidas': return 'Calendario de Comidas';
            case 'Bloques': return 'Rutina';
            case 'Finanzas': return 'Finanzas';
            case 'Deudas': return 'Deudas y Cobros';
            case 'Acción': return 'Mi Acción';
            case 'Base de Datos': return 'Base de Datos';
            case 'Proyección': return 'Proyección Financiera';
            case 'Calendario': return 'Calendario';
            case 'Stats': return 'Estadísticas';
            case 'Cerebro': return 'Cerebro';
            case 'Vida': return 'Mi Vida';
            case 'Proyectos': return 'Proyectos';
            case 'Metas': return 'Metas a Mediano y Largo Plazo';
            case 'Tablero': return 'Tablero Kanban';
            case 'Lienzo': return 'Lienzo';
            case 'Lienzo Ops': return 'Lienzo de Operaciones';
            case 'Bienestar': return 'Bienestar';
            case 'Negocio': return 'Simulador de Negocio';
            case 'Rendimiento': return 'Rendimiento';
            case 'Buscador': return 'Super Buscador Web';
            default: return tab;
        }
    };

    return (
        <>
            {/* ── Desktop Sidebar ── */}
            <header className="aldia-header desktop-header-only">
                {/* Logo */}
                <div className="sidebar-logo desktop-only" style={{ padding: '0 4px', flexShrink: 0 }}>
                    <img src="/favicon.svg" alt="AlDía" className="logo-placeholder" style={{ padding: 0 }} />
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0FA97A', letterSpacing: '-0.01em', lineHeight: 1 }}>AlDía</h1>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#4A5F58', opacity: 0.7, fontWeight: 600, letterSpacing: '0.04em' }}>Productivity Focus</p>
                    </div>
                </div>

                {/* Nav Items */}
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', paddingRight: '2px' }}>
                    {/* Primary group */}
                    {PRIMARY_ITEMS.map(item => renderSidebarBtn(item))}

                    {/* Divider */}
                    <div style={{ margin: '10px 0 6px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
                        <span style={{ flex: 1, height: '1px', background: '#DCE7E1' }} />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#6C8079', letterSpacing: '0.08em', whiteSpace: 'nowrap', opacity: 0.7 }}>
                            HERRAMIENTAS
                        </span>
                        <span style={{ flex: 1, height: '1px', background: '#DCE7E1' }} />
                    </div>

                    {/* Secondary group */}
                    {SECONDARY_ITEMS.map(item => renderSidebarBtn(item))}
                </nav>

                {/* Bottom: iconos */}
                <div style={{ borderTop: '1px solid #DCE7E1', paddingTop: '12px', flexShrink: 0, display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button onClick={onTrashClick} title="Papelera de reciclaje" style={{
                        background: 'rgba(15, 169, 122,0.08)', border: 'none', borderRadius: '12px',
                        padding: '10px 14px', cursor: 'pointer', color: '#0FA97A', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                    </button>
                    {!isInstalled && (
                        <button onClick={install} title="Instalar app" style={{
                            background: 'rgba(15, 169, 122,0.08)', border: 'none', borderRadius: '12px',
                            padding: '10px 14px', cursor: 'pointer', color: '#0FA97A', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
                        </button>
                    )}
                    <button
                        onClick={onProfileClick}
                        title="Perfil y ajustes"
                        style={{
                            background: '#3ED9A0', border: 'none', borderRadius: '12px',
                            padding: '10px 14px', cursor: 'pointer', color: '#0C8F67',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                    </button>
                </div>
            </header>

            {/* ── Mobile Header Bar ── */}
            <div className="mobile-header-bar">
                <button className="mobile-menu-trigger" onClick={() => setIsDrawerOpen(true)}>
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <div className="mobile-title-container">
                    <span className="mobile-logo-text">AlDía</span>
                    <span className="mobile-view-title">{getViewTitle(activeTab)}</span>
                </div>
                <div style={{ position: 'relative', flexShrink: 0 }} onClick={onProfileClick}>
                    <div
                        className="mobile-profile-trigger"
                        style={{
                            backgroundImage: profilePic ? `url(${profilePic})` : 'none'
                        }}
                    >
                        {!profilePic && <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#888' }}>person</span>}
                    </div>
                    <div style={{
                        position: 'absolute', bottom: '-2px', right: '-2px',
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: '#0FA97A', border: '2px solid white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '10px', color: 'white' }}>edit</span>
                    </div>
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
                        <span className="mobile-logo-text" style={{ fontSize: '1.4rem' }}>AlDía</span>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#6C8079', fontWeight: 600 }}>Productivity Focus</p>
                    </div>
                    <button className="mobile-drawer-close" onClick={() => setIsDrawerOpen(false)}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="mobile-drawer-tabs">
                    {PRIMARY_ITEMS.map(item => renderSidebarBtn(item))}
                    <div style={{ margin: '10px 0 6px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
                        <span style={{ flex: 1, height: '1px', background: '#DCE7E1' }} />
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#6C8079', letterSpacing: '0.08em', whiteSpace: 'nowrap', opacity: 0.7 }}>
                            HERRAMIENTAS
                        </span>
                        <span style={{ flex: 1, height: '1px', background: '#DCE7E1' }} />
                    </div>
                    {SECONDARY_ITEMS.map(item => renderSidebarBtn(item))}
                </div>
            </div>

            {/* ── Mobile Bottom Navigation Bar ──
                 5 accesos rápidos (BOTTOM_TABS) + botón "Más" que abre una hoja
                 con TODAS las pestañas. Antes se metían las 18 de PRIMARY_ITEMS
                 acá y las últimas quedaban fuera de pantalla. */}
            <div className="mobile-bottom-nav">
                {BOTTOM_TABS.map(tab => {
                    const item = [...PRIMARY_ITEMS, ...SECONDARY_ITEMS].find(i => i.tab === tab);
                    if (!item) return null;
                    const isActive = activeTab === item.tab;
                    return (
                        <button
                            key={item.tab}
                            onClick={() => setActiveTab(item.tab)}
                            className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
                        >
                            <span className="material-symbols-outlined">{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
                <button
                    onClick={() => setIsMoreOpen(true)}
                    className={`mobile-nav-btn ${!BOTTOM_TABS.includes(activeTab) ? 'active' : ''}`}
                >
                    <span className="material-symbols-outlined">apps</span>
                    <span>Más</span>
                </button>
            </div>

            {/* ── Hoja "Más": todas las pestañas en cuadrícula ── */}
            <div
                className={`mobile-more-backdrop ${isMoreOpen ? 'open' : ''}`}
                onClick={() => setIsMoreOpen(false)}
            />
            <div className={`mobile-more-sheet ${isMoreOpen ? 'open' : ''}`}>
                <div className="mobile-more-handle" />
                <div className="mobile-more-grid">
                    {[...PRIMARY_ITEMS, ...SECONDARY_ITEMS].map(item => {
                        const isActive = activeTab === item.tab;
                        return (
                            <button
                                key={item.tab}
                                onClick={() => { setActiveTab(item.tab); setIsMoreOpen(false); }}
                                className={`mobile-more-item ${isActive ? 'active' : ''}`}
                            >
                                <span className="material-symbols-outlined">{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Responsive Mobile Navigation CSS ── */}
            <style>{`
                /* Default / Desktop Hiding rules */
                .mobile-header-bar,
                .mobile-bottom-nav,
                .mobile-drawer,
                .mobile-drawer-backdrop,
                .mobile-more-backdrop,
                .mobile-more-sheet {
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
                        background: #F7FAF8;
                        border-bottom: 1px solid #EDF3F0;
                        position: sticky;
                        top: 0;
                        z-index: 100;
                    }

                    .mobile-menu-trigger {
                        background: none;
                        border: none;
                        cursor: pointer;
                        color: #0C2A20;
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
                        color: #0FA97A;
                    }

                    .mobile-view-title {
                        font-family: 'Plus Jakarta Sans', sans-serif;
                        font-weight: 700;
                        font-size: 1.05rem;
                        color: #0C2A20;
                        border-left: 1px solid #DCE7E1;
                        padding-left: 10px;
                    }

                    .mobile-profile-trigger {
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        background-color: #EDF3F0;
                        background-size: cover;
                        background-position: center;
                        border: 2px solid #3ED9A0;
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
                        height: calc(68px + env(safe-area-inset-bottom, 0px));
                        background: #ffffff;
                        border-top: 1px solid #EDF3F0;
                        z-index: 999;
                        box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.04);
                        padding: 0 8px calc(env(safe-area-inset-bottom, 0px));
                        box-sizing: border-box;
                        /* 6 slots (5 pestañas + "Más"): entran justas, sin scroll. */
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
                        color: #4A5F58;
                        font-family: 'Plus Jakarta Sans', sans-serif;
                        /* 6 pestañas ahora (antes 5, ancho pensado para esas) */
                        font-size: 0.62rem;
                        font-weight: 600;
                        padding: 6px 4px;
                        border-radius: 16px;
                        min-width: 52px;
                        flex: 1;
                        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    .mobile-nav-btn span.material-symbols-outlined {
                        font-size: 22px;
                        font-variation-settings: 'FILL' 0, 'wght' 500;
                        transition: transform 0.2s;
                    }

                    .mobile-nav-btn.active {
                        background: rgba(15, 169, 122, 0.1);
                        color: #0FA97A;
                    }

                    .mobile-nav-btn.active span.material-symbols-outlined {
                        font-variation-settings: 'FILL' 1, 'wght' 600;
                        transform: scale(1.08);
                    }

                    /* Hoja "Más" */
                    .mobile-more-backdrop {
                        display: block;
                        position: fixed;
                        inset: 0;
                        background: rgba(25, 28, 29, 0.4);
                        backdrop-filter: blur(2px);
                        z-index: 1000;
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.25s ease;
                    }
                    .mobile-more-backdrop.open {
                        opacity: 1;
                        pointer-events: auto;
                    }

                    .mobile-more-sheet {
                        display: block;
                        position: fixed;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        z-index: 1001;
                        background: #ffffff;
                        border-radius: 22px 22px 0 0;
                        box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.14);
                        padding: 10px 16px calc(20px + env(safe-area-inset-bottom, 0px));
                        max-height: 72vh;
                        overflow-y: auto;
                        transform: translateY(100%);
                        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .mobile-more-sheet.open {
                        transform: translateY(0);
                    }

                    .mobile-more-handle {
                        width: 40px;
                        height: 4px;
                        border-radius: 999px;
                        background: #DCE7E1;
                        margin: 4px auto 14px;
                    }

                    .mobile-more-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 6px;
                    }

                    .mobile-more-item {
                        background: none;
                        border: none;
                        cursor: pointer;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 5px;
                        padding: 12px 4px;
                        border-radius: 14px;
                        color: #4A5F58;
                        font-family: 'Plus Jakarta Sans', sans-serif;
                        font-size: 0.66rem;
                        font-weight: 600;
                        text-align: center;
                        line-height: 1.2;
                    }
                    .mobile-more-item span.material-symbols-outlined {
                        font-size: 24px;
                        font-variation-settings: 'FILL' 0, 'wght' 500;
                    }
                    .mobile-more-item.active {
                        background: rgba(15, 169, 122, 0.1);
                        color: #0FA97A;
                    }
                    .mobile-more-item.active span.material-symbols-outlined {
                        font-variation-settings: 'FILL' 1, 'wght' 600;
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
                        border-bottom: 1px solid #EDF3F0;
                    }

                    .mobile-drawer-close {
                        background: none;
                        border: none;
                        color: #4A5F58;
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
                        color: #4A5F58 !important;
                        background: transparent !important;
                        transition: all 0.2s;
                    }

                    .mobile-drawer-tab-btn.active-tab {
                        background: rgba(15, 169, 122, 0.08) !important;
                        color: #0FA97A !important;
                    }
                }
            `}</style>
        </>
    );
};
