import { motion } from 'framer-motion';
import { Target, Clock, Zap, Plus, MoreVertical, Play, Trophy } from 'lucide-react';
import type { Project, Mission, TimeBlock } from '../../hooks/useAlDiaState';

interface ProyectosDashboardProps {
    projects: Project[];
    missions: Mission[];
    timeBlocks: TimeBlock[];
}

export const ProyectosDashboard = ({ projects, missions, timeBlocks }: ProyectosDashboardProps) => {
    // Calculo del tiempo dedicado esta semana (simplificado para el demo)
    // En una app real filtraríamos por fecha, aquí asumimos que missions completadas
    // valen 1 hora (o lo que esté definido) y timeblocks = diff.
    const projectStats = projects.map(p => {
        const pMissionsCompleted = missions.filter(m => m.projectId === p.id && m.completed).length;
        const pTimeBlocks = timeBlocks.filter(b => b.projectId === p.id);
        
        // Simulación: Cada misión = 0.5 horas, cada bloque = 1 hora
        const estimatedHours = (pMissionsCompleted * 0.5) + (pTimeBlocks.length * 1);
        const progress = p.targetHoursPerWeek ? Math.min(100, Math.round((estimatedHours / p.targetHoursPerWeek) * 100)) : 0;

        return { ...p, estimatedHours, progress, missionsCount: pMissionsCompleted };
    });

    return (
        <div style={{ padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '6rem' }}>
            {/* Header / Stats Resumen */}
            <div className="glass-card" style={{ background: 'var(--text-carbon)', color: 'white', border: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', fontWeight: 900 }}>Tus Frentes</h2>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#AAA', fontWeight: 600 }}>Asigna tiempo a lo que importa</p>
                    </div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Target size={24} color="var(--domain-orange)" />
                    </div>
                </div>
            </div>

            {/* Listado de Proyectos */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Proyectos Activos</h3>
                    <button style={{ 
                        background: 'transparent', border: 'none', color: 'var(--domain-orange)', 
                        fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' 
                    }}>
                        <Plus size={14} strokeWidth={3} /> NUEVO
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {projectStats.map(p => (
                        <motion.div 
                            key={p.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="glass-card"
                            style={{ padding: '1.2rem', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                        >
                            {/* Accent line top */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: p.color }} />
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: `${p.color}15`, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', border: `2px solid ${p.color}` }}>
                                        <Zap size={16} color={p.color} fill={p.color} />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-carbon)' }}>{p.name}</h4>
                                </div>
                                <MoreVertical size={18} color="#CCC" />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: '0 0 2px 0', fontSize: '0.65rem', fontWeight: 800, color: '#888', textTransform: 'uppercase' }}>Tiempo Semanal</p>
                                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)', display: 'flex', alignItems: 'end', gap: '4px' }}>
                                        {p.estimatedHours} <span style={{ fontSize: '0.8rem', color: '#AAA', fontWeight: 700, marginBottom: '2px' }}>/ {p.targetHoursPerWeek || '-'} hrs</span>
                                    </p>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: '0 0 2px 0', fontSize: '0.65rem', fontWeight: 800, color: '#888', textTransform: 'uppercase' }}>Tareas Listas</p>
                                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)', display: 'flex', alignItems: 'end', gap: '4px' }}>
                                        {p.missionsCount} <span style={{ fontSize: '0.8rem', color: '#AAA', fontWeight: 700, marginBottom: '2px' }}>ops</span>
                                    </p>
                                </div>
                            </div>

                            {/* Barra de progreso visual si hay target */}
                            {p.targetHoursPerWeek && (
                                <div style={{ width: '100%', height: '8px', background: '#F0F0F0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${p.progress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        style={{ height: '100%', background: p.progress >= 100 ? 'var(--domain-green)' : p.color, borderRadius: '4px' }}
                                    />
                                </div>
                            )}

                        </motion.div>
                    ))}

                    {projects.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.5)', border: '2px dashed #DDD', borderRadius: '24px' }}>
                            <Trophy size={32} color="#CCC" style={{ marginBottom: '10px' }} />
                            <p style={{ margin: 0, fontWeight: 700, color: '#AAA' }}>No tienes proyectos creados</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#BBB' }}>Inicia uno nuevo para rastrear tu progreso</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Simulación de Time Log */}
            <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Última Actividad</h3>
                <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {missions.filter(m => m.completed && m.projectId).slice(0,4).map(m => {
                        const p = projects.find(proj => proj.id === m.projectId);
                        return (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid #F5F5F5' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p?.color || '#CCC' }} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-carbon)' }}>{m.text}</p>
                                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, color: '#AAA' }}>{p?.name} • Tarea Completada</p>
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--domain-green)', background: '#ECFDF5', padding: '4px 8px', borderRadius: '8px' }}>✓</span>
                            </div>
                        )
                    })}
                    {missions.filter(m => m.completed && m.projectId).length === 0 && (
                        <p style={{ textAlign: 'center', color: '#AAA', fontSize: '0.8rem', fontWeight: 700, margin: '1rem 0' }}>Aquí aparecerán tus tareas completadas de proyectos</p>
                    )}
                </div>
            </div>

        </div>
    );
};
