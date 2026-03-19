import { useState, useMemo } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, ListTodo, ArrowRight, Zap, MoreVertical, Trophy, Edit2, Check, X, Tag, GripVertical } from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { DomainIcon } from '../ui/DomainIcon';
import type { Project, Mission } from '../../hooks/useAlDiaState';

interface ProyectosProps {
    projects: Project[];
    missions: Mission[];
    timeBlocks: any[];
    rutinas: any[];
    onAddProject: () => void;
    deleteProject: (id: number) => void;
    addProjectTask: (projectId: number, text: string) => void;
    toggleProjectTask: (projectId: number, taskId: number) => void;
    removeProjectTask: (projectId: number, taskId: number) => void;
    promoteTaskToRoutine: (projectId: number, taskText: string) => void;
    reorderProjectTasks?: (projectId: number, newTasks: { id: number; text: string; completed: boolean }[]) => void;
}

export const ProyectosDashboard = ({ 
    projects, missions, onAddProject, deleteProject,
    addProjectTask, toggleProjectTask, removeProjectTask, promoteTaskToRoutine,
    reorderProjectTasks
}: ProyectosProps) => {
    const activeProjects = projects.filter(p => p.status === 'activo');
    
    return (
        <div style={{ paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Proyectos</h2>
                    <span style={{ background: 'var(--domain-blue)', color: 'white', fontSize: '0.7rem', fontWeight: 900, padding: '2px 8px', borderRadius: '10px' }}>
                        {activeProjects.length} ACTIVOS
                    </span>
                </div>
                <button 
                    onClick={onAddProject}
                    style={{ 
                        background: 'linear-gradient(135deg, var(--domain-blue) 0%, #003399 100%)', 
                        color: 'white', border: 'none', borderRadius: '12px', padding: '8px 16px', 
                        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', 
                        fontWeight: 900, fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0, 85, 255, 0.2)' 
                    }}
                >
                    <Plus size={18} /> NUEVO PROYECTO
                </button>
            </div>

            {/* GRID DE PROYECTOS OPTIMIZADO PARA DENSIDAD (2 COLUMNAS) */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
                gap: '12px', 
                marginBottom: '2rem' 
            }}>
                {activeProjects.map(project => (
                    <ProjectCard 
                        key={project.id} 
                        project={project} 
                        deleteProject={deleteProject}
                        addProjectTask={addProjectTask}
                        toggleProjectTask={toggleProjectTask}
                        removeProjectTask={removeProjectTask}
                        promoteTaskToRoutine={promoteTaskToRoutine}
                        reorderProjectTasks={reorderProjectTasks}
                    />
                ))}
                {activeProjects.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '24px', border: '2px dashed #EEE' }}>
                        <p style={{ color: '#AAA', fontWeight: 700 }}>No hay proyectos activos. ¡Crea uno para empezar!</p>
                    </div>
                )}
            </div>

            {/* SECCIÓN DE TAREAS PENDIENTES POR PROYECTO (VISTA LISTA) */}
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 900 }}>Tareas de Proyectos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {projects.map(p => {
                    const projectMissions = missions.filter(m => m.projectId === p.id && !m.completed);
                    if (projectMissions.length === 0) return null;
                    return (
                        <GlassCard key={p.id} style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color }}></div>
                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900 }}>{p.name}</h4>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {projectMissions.map(m => (
                                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: '#F9F9F9', borderRadius: '10px' }}>
                                        <ArrowRight size={12} color={p.color} />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{m.text}</span>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    );
                })}
            </div>
        </div>
    );
};

// --- COMPONENTE TARJETA DE PROYECTO (REDISEÑADO) ---

const ProjectCard = ({ 
    project, deleteProject, addProjectTask, toggleProjectTask, removeProjectTask, promoteTaskToRoutine,
    reorderProjectTasks 
}: { 
    project: Project, 
    deleteProject: (id: number) => void,
    addProjectTask: (id: number, t: string) => void,
    toggleProjectTask: (pid: number, tid: number) => void,
    removeProjectTask: (pid: number, tid: number) => void,
    promoteTaskToRoutine: (pid: number, t: string) => void,
    reorderProjectTasks?: (pid: number, tasks: any[]) => void
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    
    const completedCount = project.checklist?.filter(t => t.completed).length || 0;
    const totalCount = project.checklist?.length || 0;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleAddTask = () => {
        if (newTaskText.trim()) {
            addProjectTask(project.id, newTaskText.trim());
            setNewTaskText('');
        }
    };

    return (
        <motion.div layout>
            <GlassCard 
                style={{ 
                    padding: '0.8rem', 
                    height: isExpanded ? 'auto' : '140px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderTop: `4px solid ${project.color}`,
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    cursor: 'pointer'
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-carbon)', lineHeight: 1.2, flex: 1 }}>
                            {project.name}
                        </h4>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); if(confirm('¿Borrar proyecto?')) deleteProject(project.id); }}
                                style={{ background: 'transparent', border: 'none', color: '#EEE', padding: '2px', cursor: 'pointer' }}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>

                    <div style={{ marginTop: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#AAA' }}>PROGRESO</span>
                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: project.color }}>{Math.round(progress)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: '#F0F0F0', borderRadius: '2px', overflow: 'hidden' }}>
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                style={{ height: '100%', background: project.color }}
                            />
                        </div>
                    </div>
                </div>

                {!isExpanded && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ListTodo size={12} color="#AAA" />
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#888' }}>{completedCount}/{totalCount}</span>
                        </div>
                        <Zap size={14} color={progress === 100 ? 'var(--domain-orange)' : '#EEE'} />
                    </div>
                )}

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ marginTop: '1rem', overflow: 'hidden' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ borderTop: '1px solid #F5F5F5', paddingTop: '10px' }}>
                                <p style={{ margin: '0 0 8px 0', fontSize: '0.65rem', fontWeight: 900, color: '#AAA', textTransform: 'uppercase' }}>Checklist</p>
                                
                                <Reorder.Group 
                                    axis="y" 
                                    values={project.checklist || []} 
                                    onReorder={(newOrder) => {
                                        if (reorderProjectTasks) {
                                            reorderProjectTasks(project.id, newOrder);
                                        }
                                    }}
                                    style={{ display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none', padding: 0 }}
                                >
                                    {(project.checklist || []).map(task => (
                                        <Reorder.Item 
                                            key={task.id} 
                                            value={task}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '8px', 
                                                background: '#F9F9F9', padding: '6px 8px', borderRadius: '8px',
                                                border: '1px solid #F0F0F0'
                                            }}
                                        >
                                            <div style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                                                <GripVertical size={14} color="#DDD" />
                                            </div>
                                            <div 
                                                onClick={() => toggleProjectTask(project.id, task.id)}
                                                style={{ cursor: 'pointer', display: 'flex' }}
                                            >
                                                {task.completed ? <CheckCircle2 size={16} color="var(--domain-green)" /> : <Circle size={16} color="#DDD" />}
                                            </div>
                                            <span style={{ 
                                                fontSize: '0.75rem', fontWeight: 600, flex: 1,
                                                textDecoration: task.completed ? 'line-through' : 'none',
                                                color: task.completed ? '#AAA' : 'var(--text-carbon)'
                                            }}>
                                                {task.text}
                                            </span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button 
                                                    onClick={() => promoteTaskToRoutine(project.id, task.text)}
                                                    title="Promover a Rutina"
                                                    style={{ background: 'transparent', border: 'none', color: '#EEE', cursor: 'pointer', padding: '2px' }}
                                                >
                                                    <Zap size={10} />
                                                </button>
                                                <button 
                                                    onClick={() => removeProjectTask(project.id, task.id)}
                                                    style={{ background: 'transparent', border: 'none', color: '#EEE', cursor: 'pointer', padding: '2px' }}
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        </Reorder.Item>
                                    ))}
                                </Reorder.Group>

                                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                                    <input 
                                        placeholder="Nueva tarea..."
                                        value={newTaskText}
                                        onChange={(e) => setNewTaskText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                        style={{ flex: 1, border: '1px solid #EEE', borderRadius: '8px', padding: '6px 10px', fontSize: '0.75rem', outline: 'none' }}
                                    />
                                    <button 
                                        onClick={handleAddTask}
                                        style={{ background: project.color, color: 'white', border: 'none', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </GlassCard>
        </motion.div>
    );
};
