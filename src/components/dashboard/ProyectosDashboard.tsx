import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, MoreVertical, Trophy, Trash2, CheckCircle2, Circle, ListTodo, ArrowRight } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { DomainIcon } from '../ui/DomainIcon';
import { ModernInput } from '../ui/ModernInput';
import type { Project, Mission, TimeBlock, Routine } from '../../hooks/useAlDiaState';

interface ProyectosDashboardProps {
    projects: Project[];
    missions: Mission[];
    timeBlocks: TimeBlock[];
    rutinas: Routine[];
    onAddProject: () => void;
    deleteProject?: (id: number) => void;
    addProjectTask?: (projectId: number, text: string) => void;
    toggleProjectTask?: (projectId: number, taskId: number) => void;
    removeProjectTask?: (projectId: number, taskId: number) => void;
    promoteTaskToRoutine?: (projectId: number, taskId: number, routineId: number) => void;
}

export const ProyectosDashboard = ({ 
    projects = [], missions = [], timeBlocks = [], rutinas = [], onAddProject, deleteProject,
    addProjectTask, toggleProjectTask, removeProjectTask, promoteTaskToRoutine 
}: ProyectosDashboardProps) => {
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
    const [promotingTask, setPromotingTask] = useState<{ projectId: number, taskId: number } | null>(null);

    // Calculo del tiempo dedicado esta semana (Optimizado)
    const projectStats = (projects || []).map(p => {
        const pMissionsCompleted = (missions || []).filter(m => m.projectId === p.id && m.completed).length;
        const pTimeBlocks = (timeBlocks || []).filter(b => b.projectId === p.id);
        
        const estimatedHours = (pMissionsCompleted * 0.5) + (pTimeBlocks.length * 1);
        const progress = p.targetHoursPerWeek ? Math.min(100, Math.round((estimatedHours / p.targetHoursPerWeek) * 100)) : 0;

        return { ...p, estimatedHours, progress, missionsCount: pMissionsCompleted };
    });

    return (
        <div style={{ padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '6rem' }}>
            {/* Header / Stats Resumen */}
            <GlassCard 
                variant="strong"
                style={{ background: 'var(--text-carbon)', color: 'white', border: 'none' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: '0 0 4px 0', fontSize: '1.5rem', fontWeight: 900 }}>Tus Frentes</h2>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#AAA', fontWeight: 600 }}>Asigna tiempo a lo que importa</p>
                    </div>
                    <DomainIcon domain="proyectos" variant="solid" size={24} className="opacity-90" />
                </div>
            </GlassCard>

            {/* Listado de Proyectos */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Proyectos Activos</h3>
                    <button 
                        onClick={onAddProject}
                        style={{ 
                            background: 'transparent', border: 'none', color: 'var(--domain-orange)', 
                            fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' 
                        }}
                    >
                        <Plus size={14} strokeWidth={3} /> NUEVO
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {projectStats.map(p => (
                        <ProjectCard 
                            key={p.id}
                            project={p}
                            activeMenuId={activeMenuId}
                            setActiveMenuId={setActiveMenuId}
                            setPromotingTask={setPromotingTask}
                            deleteProject={deleteProject}
                            addProjectTask={addProjectTask}
                            toggleProjectTask={toggleProjectTask}
                            removeProjectTask={removeProjectTask}
                        />
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

            {/* Modales Compartidos */}
            <AnimatePresence>
                {promotingTask && (
                    <div 
                        style={{ 
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, 
                            background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '20px'
                        }}
                        onClick={() => setPromotingTask(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: '320px', padding: '1.5rem', background: 'white' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 900 }}>¿A qué rutina lo enviamos?</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {(rutinas || []).map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => {
                                            promoteTaskToRoutine?.(promotingTask.projectId, promotingTask.taskId, r.id);
                                            setPromotingTask(null);
                                        }}
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '10px', padding: '12px',
                                            borderRadius: '12px', border: '1px solid #EEE', background: 'white',
                                            fontWeight: 800, color: 'var(--text-carbon)', cursor: 'pointer', textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: r.color }} />
                                        {r.title}
                                    </button>
                                ))}
                                <button 
                                    onClick={() => setPromotingTask(null)}
                                    style={{ marginTop: '10px', padding: '10px', border: 'none', background: 'transparent', color: '#888', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    CANCELAR
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Simulación de Time Log */}
            <div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Última Actividad</h3>
                <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(missions || []).filter(m => m.completed && m.projectId).slice(0,4).map(m => {
                        const p = projects.find(proj => proj.id === m.projectId);
                        return (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid #F5F5F5' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p?.color || '#CCC' }} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-carbon)' }}>{m.text}</p>
                                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, color: '#AAA' }}>{p?.name || 'Proyecto'} • Tarea Completada</p>
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--domain-green)', background: '#ECFDF5', padding: '4px 8px', borderRadius: '8px' }}>✓</span>
                            </div>
                        )
                    })}
                    {(missions || []).filter(m => m.completed && m.projectId).length === 0 && (
                        <p style={{ textAlign: 'center', color: '#AAA', fontSize: '0.8rem', fontWeight: 700, margin: '1rem 0' }}>Aquí aparecerán tus tareas completadas de proyectos</p>
                    )}
                </div>
            </div>

        </div>
    );
};

// --- SUB-COMPONENTE PARA AISLAR ESTADO ---
interface ProjectCardProps {
    project: any;
    activeMenuId: number | null;
    setActiveMenuId: (id: number | null) => void;
    setPromotingTask: (task: { projectId: number, taskId: number } | null) => void;
    deleteProject?: (id: number) => void;
    addProjectTask?: (projectId: number, text: string) => void;
    toggleProjectTask?: (projectId: number, taskId: number) => void;
    removeProjectTask?: (projectId: number, taskId: number) => void;
}

const ProjectCard = ({ 
    project: p, activeMenuId, setActiveMenuId, setPromotingTask,
    deleteProject, addProjectTask, toggleProjectTask, removeProjectTask
}: ProjectCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [localTaskText, setLocalTaskText] = useState("");

    const handleAddTask = () => {
        if (localTaskText.trim() && addProjectTask) {
            addProjectTask(p.id, localTaskText.trim());
            setLocalTaskText("");
        }
    };

    return (
        <motion.div 
            whileHover={{ scale: 1.01 }}
            className="glass-card"
            style={{ padding: '1.2rem', cursor: 'default', position: 'relative', overflow: 'visible' }}
        >
            {/* Accent line top */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: p.color, borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: `${p.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${p.color}` }}>
                        <Zap size={16} color={p.color} fill={p.color} />
                    </div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-carbon)' }}>{p.name}</h4>
                </div>
                
                <div style={{ position: 'relative' }}>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === p.id ? null : p.id);
                        }}
                        style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', borderRadius: '50%' }}
                    >
                        <MoreVertical size={18} color="#CCC" />
                    </button>

                    <AnimatePresence>
                        {activeMenuId === p.id && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                style={{
                                    position: 'absolute', top: '100%', right: 0, zIndex: 50,
                                    background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                    border: '1px solid #EEE', minWidth: '140px', padding: '6px', overflow: 'hidden'
                                }}
                            >
                                <button
                                    onClick={() => {
                                        if (confirm('¿Eliminar este proyecto?') && deleteProject) {
                                            deleteProject(p.id);
                                        }
                                        setActiveMenuId(null);
                                    }}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '8px 12px', background: 'transparent', border: 'none',
                                        color: '#f87171', fontWeight: 700, fontSize: '0.75rem',
                                        cursor: 'pointer', borderRadius: '8px'
                                    }}
                                >
                                    <Trash2 size={14} /> Eliminar Proyecto
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
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

            {p.targetHoursPerWeek && (
                <div style={{ width: '100%', height: '8px', background: '#F0F0F0', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${p.progress}%` }}
                        style={{ height: '100%', background: p.progress >= 100 ? 'var(--domain-green)' : p.color, borderRadius: '4px' }}
                    />
                </div>
            )}

            <div style={{ borderTop: '1px solid #F0F0F0', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <div 
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ListTodo size={14} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                            CHECKLIST ({p.checklist?.length || 0})
                        </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{isExpanded ? 'OCULTAR' : 'VER'}</span>
                </div>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{ display: 'flex', gap: '8px', margin: '12px 0', alignItems: 'flex-end' }}>
                                <ModernInput 
                                    placeholder="Nueva idea o tarea..."
                                    value={localTaskText}
                                    onChange={(e) => setLocalTaskText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                    containerClassName="flex-1"
                                />
                                <button 
                                    onClick={handleAddTask}
                                    style={{ 
                                        background: p.color, color: 'white', border: 'none', 
                                        borderRadius: '16px', height: '46px', width: '46px', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', marginBottom: '1.5px' 
                                    }}
                                >
                                    <Plus size={20} strokeWidth={3} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(p.checklist || []).map((task: any) => (
                                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button 
                                            onClick={() => toggleProjectTask?.(p.id, task.id)}
                                            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: task.completed ? 'var(--domain-green)' : '#CCC' }}
                                        >
                                            {task.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                        </button>
                                        <span style={{ 
                                            flex: 1, fontSize: '0.8rem', fontWeight: 600, 
                                            textDecoration: task.completed ? 'line-through' : 'none',
                                            color: task.completed ? '#AAA' : 'var(--text-carbon)'
                                        }}>
                                            {task.text}
                                        </span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button 
                                                onClick={() => setPromotingTask({ projectId: p.id, taskId: task.id })}
                                                title="Promover a Rutina"
                                                style={{ background: '#F0F9FF', border: 'none', padding: '4px', borderRadius: '6px', color: '#0EA5E9', cursor: 'pointer' }}
                                            >
                                                <ArrowRight size={14} />
                                            </button>
                                            <button 
                                                onClick={() => removeProjectTask?.(p.id, task.id)}
                                                style={{ background: '#FEF2F2', border: 'none', padding: '4px', borderRadius: '6px', color: '#EF4444', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};
