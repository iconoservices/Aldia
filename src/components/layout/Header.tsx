

interface HeaderProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onProfileClick: () => void;
}

export const Header = ({ activeTab, setActiveTab, onProfileClick }: HeaderProps) => {




    return (
        <header className="aldia-header">
            <div className="header-left">
                <img src="/logo.png" alt="AlDia Logo" style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
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

            <div className="header-right">
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
                        transition: 'transform 0.2s ease'
                    }}
                >
                    <img src="/logo.png" alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            </div>
        </header>
    );
};
