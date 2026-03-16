import { BarChart3, Activity, Target, Flame, CalendarDays } from 'lucide-react';

interface StatsProps {
    performanceScore: number;
    missionFocusScore: number;
    completedMissionsCount: number;
}

export const StatsDashboard = ({ performanceScore, missionFocusScore, completedMissionsCount }: StatsProps) => {
    return (
        <div style={{ paddingBottom: '5rem' }}>
            {/* CABECERA DE RESUMEN / PERFORMANCE SCORE */}
            <div className="glass-card" style={{ marginBottom: '1.5rem', background: 'var(--text-carbon)', color: 'white', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--domain-green)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>🏆 PERFORMANCE SCORE</span>
                    <h2 style={{ margin: '4px 0 0 0', fontSize: '2.5rem', fontWeight: 900, color: 'white' }}>{Math.round(performanceScore)}<span style={{ fontSize: '1.2rem', color: '#888' }}>/100</span></h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#CCC' }}>
                        {performanceScore > 70 ? '¡Modo bestia activado! Sigue así.' : 'Un paso a la vez. ¡Tú puedes!'}
                    </p>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '50%' }}>
                    <Activity size={32} color="var(--domain-green)" />
                </div>
            </div>

            {/* MAPA DE CALOR (Simulado) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Mapa de Esfuerzo</h3>
                <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: 600 }}>Vista Mensual ⭢</span>
            </div>

            <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '6px' }}>
                    {[...Array(30)].map((_, i) => {
                        const intensity = i % 4; // Solo visual
                        const bgColors = ['#F0EBE6', '#FFECCF', '#FFB76B', 'var(--domain-orange)'];
                        return (
                            <div key={i} style={{
                                width: '100%',
                                aspectRatio: '1/1',
                                backgroundColor: bgColors[intensity],
                                borderRadius: '4px'
                            }}></div>
                        );
                    })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.7rem', color: '#888', fontWeight: 600 }}>
                    <span>Menos Productivo</span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{ width: '10px', height: '10px', background: ['#F0EBE6', '#FFECCF', '#FFB76B', 'var(--domain-orange)'][i], borderRadius: '2px' }}></div>
                        ))}
                    </div>
                    <span>Modo Bestia</span>
                </div>
            </div>

            {/* ESTADÍSTICAS RÁPIDAS */}
            <h3 style={{ marginBottom: '1rem' }}>Desglose de Impacto</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
                        <Target size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Misiones Resueltas</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-carbon)' }}>{completedMissionsCount}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--domain-green)', fontWeight: 700 }}>{Math.round(missionFocusScore)}% del total</span>
                </div>

                <div className="glass-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
                        <BarChart3 size={16} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Impacto Habit</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-carbon)' }}>{Math.round(performanceScore)}%</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--domain-green)', fontWeight: 700 }}>Constancia semana</span>
                </div>
            </div>

            {/* TROFEOS / RACHAS */}
            <h3 style={{ marginBottom: '1rem' }}>Tus Trofeos Vivos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderLeft: '4px solid var(--domain-orange)' }}>
                    <div style={{ background: '#FFF5EB', padding: '12px', borderRadius: '14px' }}>
                        <Flame size={24} color="var(--domain-orange)" />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--text-carbon)' }}>Imparable: 12 Días</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>Tu racha de misiones impecable.</p>
                    </div>
                </div>

                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderLeft: '4px solid var(--domain-purple)' }}>
                    <div style={{ background: '#F4EFFF', padding: '12px', borderRadius: '14px' }}>
                        <CalendarDays size={24} color="var(--domain-purple)" />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--text-carbon)' }}>Arquitecto de Hábitos</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>90% de tus hábitos completados.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
