import { Flame, Target, MoreVertical } from 'lucide-react';

interface BentoGridProps {
    performanceScore: number;
}

export const BentoGrid = ({ performanceScore }: BentoGridProps) => {
    // Cálculo dinámico del progreso del año
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const yearProgress = Math.round((dayOfYear / 365) * 100);

    return (
        <div className="bento-grid">
            {/* HERO WIDGET (Pomodoro) */}
            <div className="glass-card hero-widget">
                <div className="widget-header">
                    <MoreVertical size={20} className="icon-subtle" />
                </div>
                <div className="pomodoro-visual">
                    <h2 className="pomodoro-time">15:00</h2>
                </div>
                <p className="widget-label">Enfoque Actual</p>
                <span className="badge-active" style={{ color: performanceScore > 50 ? 'var(--domain-green)' : 'var(--domain-orange)' }}>
                    {performanceScore > 70 ? 'Ultra Foco' : 'Productivo'}
                </span>
            </div>

            {/* RIGHT COLUMN (Streak + Minis) */}
            <div className="right-widgets">
                {/* HORIZONTAL PILL (Fire Streak) */}
                <div className="glass-card streak-widget">
                    <Flame size={28} color="white" strokeWidth={2.5} fill="white" />
                    <p>8 Días de Racha</p>
                </div>

                {/* DOS CUADRADOS SMALL */}
                <div className="mini-widgets-row">
                    <div className="glass-card mini-square">
                        <Target size={24} color="#3D312E" strokeWidth={2} />
                        <p>Meta<br />Hoy</p>
                    </div>
                    {/* WIDGET DE PROGRESO DE AÑO / DIAS */}
                    <div className="glass-card mini-square center-content" style={{ background: 'var(--text-carbon)', color: 'white' }}>
                        <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 600, opacity: 0.7, color: 'white' }}>EL {now.getFullYear()} VA AL</p>
                        <h3 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', fontWeight: 900, color: 'var(--domain-green)' }}>{yearProgress}%</h3>
                        <p style={{ margin: 0, fontSize: '0.55rem', color: '#888' }}>Día {dayOfYear} / 365</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
