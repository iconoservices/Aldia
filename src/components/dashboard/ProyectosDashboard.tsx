import { Plus, Trash2, ListTodo, Edit2, Archive, Play, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    reorderProjects: (newOrder: Project[]) => void;
}

export const ProyectosDashboard = ({ 
    projects, onAddProject, deleteProject, updateProject, onOpenDetail, reorderProjects
}: ProyectosProps) => {
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [isDetailedView, setIsDetailedView] = useState(false);
    
    // Estado para el Drag & Drop nativo
    const [draggedProject, setDraggedProject] = useState<Project | null>(null);

    const activeItems = projects.filter(p => (p.status === 'activo' || !p.status) && !p.parentId);
    const archivedItems = projects.filter(p => p.status === 'pausado' && !p.parentId);

    const displayedProjects = projects.filter(p => {
        const matchesStatus = showArchived ? p.status === 'pausado' : (p.status === 'activo' || !p.status);
        if (!matchesStatus) return false;
        if (isDetailedView) return true;
        return !p.parentId;
    });
    
    return (
        <div style={{ paddingBottom: '5rem' }}>
            <div className="proyectos-header-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>Proyectos</h2>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <span style={{ background: 'var(--domain-blue)', color: 'white', fontSize: '0.6rem', fontWeight: 900, padding: '2px 8px', borderRadius: '10px' }}>
                                {activeItems.length} ACT
                            </span>
                            <span style={{ background: '#F1F5F9', color: '#94A3B8', fontSize: '0.6rem', fontWeight: 900, padding: '2px 8px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                {archivedItems.length} ARCH
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ 
                    display: 'flex', 
                    gap: '6px', 
                    overflowX: 'auto', 
                    paddingBottom: '4px',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    <button 
                        onClick={() => setIsDetailedView(!isDetailedView)}
                        style={{ 
                            background: isDetailedView ? '#F0EBE6' : 'white', 
                            color: isDetailedView ? 'var(--domain-purple)' : '#888', border: '1px solid #EEE', borderRadius: '12px', padding: '6px 10px', 
                            display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', 
                            fontWeight: 900, fontSize: '0.65rem', transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                    >
                        <ListTodo size={12} /> 
                        {isDetailedView ? 'AGRUPADA' : 'PLANA'}
                    </button>
                    <button 
                        onClick={() => setShowArchived(!showArchived)}
                        style={{ 
                            background: showArchived ? '#F0EBE6' : 'white', 
                            color: showArchived ? 'var(--text-carbon)' : '#888', border: '1px solid #EEE', borderRadius: '12px', padding: '6px 10px', 
                            display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', 
                            fontWeight: 900, fontSize: '0.65rem', transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}
                    >
                        {showArchived ? <Play size={12} /> : <Archive size={12} />} 
                        {showArchived ? 'ACTIVOS' : 'ARCHIVOS'}
                    </button>
                    <button 
                        onClick={onAddProject}
                        style={{ 
                            background: 'linear-gradient(135deg, var(--domain-blue) 0%, #003399 100%)', 
                            color: 'white', border: 'none', borderRadius: '12px', padding: '6px 12px', 
                            display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', 
                            fontWeight: 900, fontSize: '0.65rem', boxShadow: '0 4px 12px rgba(0, 85, 255, 0.2)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            marginLeft: 'auto'
                        }}
                    >
                        <Plus size={14} /> NUEVO
                    </button>
                </div>
            </div>

            <div 
                style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                    gap: '20px', 
                    padding: 0,
                    listStyle: 'none'
                }}
            >
                <AnimatePresence>
                {displayedProjects.map(project => (
                    <motion.div 
                        key={project.id} 
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                        draggable
                        onDragStart={(e: any) => {
                            setDraggedProject(project);
                            if (e.dataTransfer) {
                                e.dataTransfer.effectAllowed = 'move';
                            }
                        }}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            if (draggedProject && draggedProject.id !== project.id) {
                                const newOrder = [...displayedProjects];
                                const dragIndex = newOrder.findIndex(p => p.id === draggedProject.id);
                                const hoverIndex = newOrder.findIndex(p => p.id === project.id);
                                
                                newOrder.splice(dragIndex, 1);
                                newOrder.splice(hoverIndex, 0, draggedProject);
                                
                                const otherProjects = projects.filter(p => !displayedProjects.find(dp => dp.id === p.id));
                                reorderProjects([...newOrder, ...otherProjects]);
                            }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={() => {
                            setDraggedProject(null);
                        }}
                        style={{ 
                            listStyle: 'none', 
                            opacity: draggedProject?.id === project.id ? 0 : 1,
                            cursor: draggedProject ? 'grabbing' : 'auto'
                        }}
                    >
                        <ProjectCard 
                            project={project} 
                            allProjects={projects}
                            deleteProject={deleteProject}
                            onEdit={() => setEditingProject(project)}
                            onOpenDetail={onOpenDetail}
                        />
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>

            {displayedProjects.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '24px', border: '2px dashed #F1F5F9' }}>
                    <p style={{ color: '#94A3B8', fontWeight: 700, margin: 0 }}>
                        {showArchived ? 'No tienes proyectos archivados.' : 'No hay proyectos activos. ¡Crea uno para empezar!'}
                    </p>
                </div>
            )}

            <ProjectEditOverlay 
                isOpen={!!editingProject}
                onClose={() => setEditingProject(null)}
                project={editingProject}
                projects={projects}
                updateProject={updateProject}
            />
        </div>
    );
};

const ProjectCard = ({ 
    project, allProjects, deleteProject, onEdit, onOpenDetail
}: { 
    project: Project, 
    allProjects: Project[],
    deleteProject: (id: number) => void,
    onEdit: () => void,
    onOpenDetail: (pid: number) => void
}) => {
    const subProjects = allProjects.filter(p => p.parentId === project.id);
    const hasSubProjects = subProjects.length > 0;
    
    const getProjectTasks = (p: Project) => p.checklist || [];
    const allNestedTasks = [
        ...getProjectTasks(project),
        ...subProjects.flatMap(sp => getProjectTasks(sp))
    ];
    
    const completedCount = allNestedTasks.filter(t => t.completed).length;
    const totalCount = allNestedTasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <GlassCard 
            style={{ 
                padding: '1.5rem', 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderTop: `6px solid ${project.color}`,
                cursor: 'pointer',
                background: 'white',
                gap: '16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                borderRadius: '20px',
                transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onClick={() => onOpenDetail(project.id)}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.03)'; }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ padding: '2px 0', cursor: 'grab' }}>
                        <GripVertical size={16} color="#CBD5E1" />
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)', lineHeight: 1.2 }}>
                            {project.name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {hasSubProjects && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: project.color, background: `${project.color}15`, padding: '4px 8px', borderRadius: '8px' }}>
                                    📁 {subProjects.length} PROYECTOS HIJOS
                                </span>
                            )}
                            {project.parentId && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#888', background: '#F1F5F9', padding: '4px 8px', borderRadius: '8px' }}>
                                    En: {allProjects.find(p => p.id === project.parentId)?.name || '...'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        style={{ background: '#F8FAFC', border: 'none', color: '#64748B', borderRadius: '10px', padding: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#F8FAFC'}
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm('¿Borrar proyecto?')) deleteProject(project.id); }}
                        style={{ background: '#FEF2F2', border: 'none', color: '#EF4444', borderRadius: '10px', padding: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#FEE2E2'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#FEF2F2'}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '4px 10px', borderRadius: '12px' }}>
                        <ListTodo size={14} color="#64748B" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#334155' }}>{completedCount}/{totalCount} Tareas</span>
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 900, color: project.color }}>{Math.round(progress)}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        style={{ height: '100%', background: project.color, borderRadius: '4px' }}
                    />
                </div>
            </div>
        </GlassCard>
    );
};
