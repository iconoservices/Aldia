

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
                    style={{ cursor: 'pointer', background: 'var(--domain-orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.8rem' }}
                >
                    JD
                </div>
            </div>
        </header>
    );
};
