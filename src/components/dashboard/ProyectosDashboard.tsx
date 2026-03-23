import { Plus, Trash2, ListTodo, Zap, Edit2, Archive, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import type { Project } from '../../hooks/useAlDiaState';
import { ProjectEditOverlay } from '../features/ProjectEditOverlay';

interface ProyectosProps {
    projects: Project[];
    onAddProject: () => void;
    deleteProject: (id: number) => void;
    updateProject: (id: number, updates: Partial<Project>) => void;
    onOpenDetail: (projectId: number) => void;
}

export const ProyectosDashboard = ({ 
    projects, onAddProject, deleteProject, updateProject, onOpenDetail
}: ProyectosProps) => {
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    const displayedProjects = projects.filter(p => showArchived ? p.status === 'pausado' : (p.status === 'activo' || !p.status));
    
    return (
        <div style={{ paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Proyectos</h2>
                    <span style={{ background: showArchived ? '#64748b' : 'var(--domain-blue)', color: 'white', fontSize: '0.7rem', fontWeight: 900, padding: '2px 8px', borderRadius: '10px' }}>
                        {displayedProjects.length} {showArchived ? 'ARCHIVADOS' : 'ACTIVOS'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={() => setShowArchived(!showArchived)}
                        style={{ 
                            background: showArchived ? '#F0EBE6' : 'white', 
                            color: showArchived ? 'var(--text-carbon)' : '#888', border: '1px solid #EEE', borderRadius: '12px', padding: '8px 12px', 
                            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', 
                            fontWeight: 900, fontSize: '0.75rem', transition: 'all 0.2s' 
                        }}
                    >
                        {showArchived ? <Play size={14} /> : <Archive size={14} />} 
                        {showArchived ? 'VER ACTIVOS' : 'VER ARCHIVADOS'}
                    </button>
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
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
                gap: '12px', 
                marginBottom: '2rem' 
            }}>
                {displayedProjects.map(project => (
                    <ProjectCard 
                        key={project.id} 
                        project={project} 
                        deleteProject={deleteProject}
                        onEdit={() => setEditingProject(project)}
                        onOpenDetail={onOpenDetail}
                    />
                ))}
                {displayedProjects.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '24px', border: '2px dashed #EEE' }}>
                        <p style={{ color: '#AAA', fontWeight: 700 }}>
                            {showArchived ? 'No tienes proyectos archivados.' : 'No hay proyectos activos. ¡Crea uno para empezar!'}
                        </p>
                    </div>
                )}
            </div>

            <ProjectEditOverlay 
                isOpen={!!editingProject}
                onClose={() => setEditingProject(null)}
                project={editingProject}
                updateProject={updateProject}
            />
        </div>
    );
};

const ProjectCard = ({ 
    project, deleteProject, onEdit, onOpenDetail
}: { 
    project: Project, 
    deleteProject: (id: number) => void,
    onEdit: () => void,
    onOpenDetail: (pid: number) => void
}) => {
    const completedCount = project.checklist?.filter((t: any) => t.completed).length || 0;
    const totalCount = project.checklist?.length || 0;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <motion.div layout whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <GlassCard 
                style={{ 
                    padding: '1rem', 
                    height: '140px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderTop: `4px solid ${project.color}`,
                    cursor: 'pointer',
                    background: 'white'
                }}
                onClick={() => onOpenDetail(project.id)}
            >
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: 'var(--text-carbon)', lineHeight: 1.2, flex: 1 }}>
                            {project.name}
                        </h4>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onEdit();
                                }}
                                style={{ background: 'transparent', border: 'none', color: '#CCC', padding: '2px', cursor: 'pointer' }}
                            >
                                <Edit2 size={12} />
                            </button>
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
                        <div style={{ width: '100%', height: '4px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' }}>
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                style={{ height: '100%', background: project.color }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ListTodo size={12} color="#AAA" />
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8' }}>{completedCount}/{totalCount}</span>
                    </div>
                    <Zap size={14} color={progress === 100 ? 'var(--domain-orange)' : '#F1F5F9'} />
                </div>
            </GlassCard>
        </motion.div>
    );
};
