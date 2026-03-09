import type { Mission } from '../../hooks/useAlDiaState';

interface UpcomingListProps {
    missions: Mission[];
}

export const UpcomingList = ({ missions }: UpcomingListProps) => {
    // Filtrar misiones críticas no completadas
    const criticalMissions = missions.filter(m => m.critical && !m.completed);

    return (
        <>
            <h3>Próximos Pasos (Críticos)</h3>
            <div className="upcoming-list">
                {criticalMissions.length === 0 ? (
                    <div className="glass-card capsule upcoming-item" style={{ background: '#F5F5F5', color: '#AAA', textAlign: 'center' }}>
                        No hay urgencias pendientes ✨
                    </div>
                ) : (
                    criticalMissions.slice(0, 3).map(m => (
                        <div key={m.id} className="glass-card capsule upcoming-item" style={{ background: 'var(--domain-orange)', color: 'white', fontWeight: 800 }}>
                            🔥 {m.text}
                        </div>
                    ))
                )}
            </div>
        </>
    );
};
