

interface HeaderProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export const Header = ({ activeTab, setActiveTab }: HeaderProps) => {
    return (
        <header className="aldia-header">
            <div className="header-left">
                <div className="logo-placeholder">a</div>
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
                <div className="profile-pic"></div>
            </div>
        </header>
    );
};
