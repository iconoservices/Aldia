import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle2, Circle, Trash2, GripVertical } from 'lucide-react';
import type { Project } from '../../hooks/useAlDiaState';

interface ProjectsKanbanViewProps {
    projects: Project[];
    addProjectTask: (projectId: number, text: string) => void;
    toggleProjectTask: (projectId: number, taskId: number) => void;
    removeProjectTask: (projectId: number, taskId: number) => void;
    updateProjectTask: (projectId: number, taskId: number, updates: Partial<{ text: string; completed: boolean }>) => void;
    reorderProjectTasks: (projectId: number, newTasks: any[]) => void;
}

export const ProjectsKanbanView = ({
    projects,
    addProjectTask,
    toggleProjectTask,
    removeProjectTask,
    updateProjectTask,
    reorderProjectTasks
}: ProjectsKanbanViewProps) => {
    const activeProjects = projects.filter(p => (p.status === 'activo' || !p.status) && !p.parentId);

    return (
        <div style={{ height: '100%', minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-carbon)' }}>📋 Tablero</h2>
                <span style={{ fontSize: '0.75rem', color: '#6C8079', fontWeight: 700 }}>{activeProjects.length} proyectos activos</span>
            </div>

            <div style={{
                display: 'flex',
                gap: '0px',
                overflowX: 'auto',
                paddingBottom: '2rem',
                flex: 1,
                alignItems: 'flex-start',
                scrollbarWidth: 'thin',
                scrollbarColor: '#DCE7E1 transparent',
                borderLeft: '1px solid #DCE7E1'
            }}>
                {activeProjects.map(project => (
                    <ProjectColumn
                        key={project.id}
                        project={project}
                        addProjectTask={addProjectTask}
                        toggleProjectTask={toggleProjectTask}
                        removeProjectTask={removeProjectTask}
                        updateProjectTask={updateProjectTask}
                        reorderProjectTasks={reorderProjectTasks}
                    />
                ))}

                {activeProjects.length === 0 && (
                    <div style={{ width: '100%', textAlign: 'center', padding: '4rem 2rem' }}>
                        <p style={{ color: '#6C8079', fontWeight: 700 }}>No hay proyectos activos para mostrar.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ProjectColumn = ({
    project, addProjectTask, toggleProjectTask, removeProjectTask, updateProjectTask, reorderProjectTasks
}: {
    project: Project,
    addProjectTask: any, toggleProjectTask: any, removeProjectTask: any, updateProjectTask: any, reorderProjectTasks: any
}) => {
    const [newTaskText, setNewTaskText] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [editTaskText, setEditTaskText] = useState('');
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);

    const tasks = project.checklist || [];
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTaskText.trim()) {
            addProjectTask(project.id, newTaskText.trim());
            setNewTaskText('');
            setIsAdding(false);
        }
    };

    const handleUpdateTask = (taskId: number) => {
        if (editTaskText.trim()) {
            updateProjectTask(project.id, taskId, { text: editTaskText.trim() });
        }
        setEditingTaskId(null);
    };

    const handleDragStart = (e: any, taskId: number) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e: any, hoverTaskId: number) => {
        e.preventDefault();
        if (draggedTaskId !== null && draggedTaskId !== hoverTaskId) {
            const dragIndex = tasks.findIndex(t => t.id === draggedTaskId);
            const hoverIndex = tasks.findIndex(t => t.id === hoverTaskId);
            if (dragIndex === -1 || hoverIndex === -1) return;
            const newTasks = [...tasks];
            const [dragged] = newTasks.splice(dragIndex, 1);
            newTasks.splice(hoverIndex, 0, dragged);
            reorderProjectTasks(project.id, newTasks);
        }
    };

    return (
        <div style={{
            minWidth: '260px',
            maxWidth: '260px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#F7FAF8',
            borderRight: '1px solid #DCE7E1',
            borderBottom: '1px solid #DCE7E1',
            borderTop: '1px solid #DCE7E1'
        }}>
            {/* Header compacto */}
            <div style={{
                padding: '10px 12px 8px',
                borderBottom: `3px solid ${project.color}`,
                background: 'white'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-carbon)', lineHeight: 1.2 }}>
                        {project.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: project.color, whiteSpace: 'nowrap', marginLeft: '8px' }}>
                        {completedCount}/{totalCount}
                    </span>
                </div>
                {/* Barra de progreso ultra fina */}
                <div style={{ width: '100%', height: '3px', background: '#F7FAF8', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        style={{ height: '100%', background: project.color, borderRadius: '2px' }}
                    />
                </div>
            </div>

            {/* Lista de tareas — flat, sin tarjetas */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
                <AnimatePresence>
                    {tasks.map(task => (
                        <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            draggable
                            onDragStart={(e: any) => handleDragStart(e, task.id)}
                            onDragEnter={(e: any) => handleDragEnter(e, task.id)}
                            onDragOver={(e: any) => e.preventDefault()}
                            onDragEnd={() => setDraggedTaskId(null)}
                            onMouseEnter={() => setHoveredTaskId(task.id)}
                            onMouseLeave={() => setHoveredTaskId(null)}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '6px',
                                padding: '6px 10px',
                                borderBottom: '1px solid #EEF2F6',
                                opacity: draggedTaskId === task.id ? 0.3 : 1,
                                background: hoveredTaskId === task.id ? '#EEF2F6' : 'transparent',
                                transition: 'background 0.1s',
                                cursor: draggedTaskId ? 'grabbing' : 'default'
                            }}
                        >
                            {/* Grip */}
                            <div style={{ cursor: 'grab', paddingTop: '2px', opacity: hoveredTaskId === task.id ? 1 : 0, transition: 'opacity 0.15s' }}>
                                <GripVertical size={12} color="#6C8079" />
                            </div>

                            {/* Checkbox */}
                            <button
                                onClick={() => toggleProjectTask(project.id, task.id)}
                                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', paddingTop: '2px', flexShrink: 0 }}
                            >
                                {task.completed
                                    ? <CheckCircle2 size={16} color={project.color} />
                                    : <Circle size={16} color="#DCE7E1" />
                                }
                            </button>

                            {/* Texto */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {editingTaskId === task.id ? (
                                    <input
                                        autoFocus
                                        value={editTaskText}
                                        onChange={(e) => setEditTaskText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleUpdateTask(task.id);
                                            if (e.key === 'Escape') setEditingTaskId(null);
                                        }}
                                        onBlur={() => handleUpdateTask(task.id)}
                                        style={{
                                            width: '100%', border: 'none', borderBottom: `1px solid ${project.color}`,
                                            background: 'transparent', padding: '0 0 2px', fontSize: '0.8rem',
                                            fontWeight: 600, outline: 'none', color: 'var(--text-carbon)'
                                        }}
                                    />
                                ) : (
                                    <span
                                        onClick={() => { setEditingTaskId(task.id); setEditTaskText(task.text); }}
                                        style={{
                                            fontSize: '0.8rem',
                                            fontWeight: task.completed ? 500 : 600,
                                            color: task.completed ? '#6C8079' : '#334155',
                                            textDecoration: task.completed ? 'line-through' : 'none',
                                            cursor: 'text',
                                            display: 'block',
                                            lineHeight: 1.35,
                                            wordBreak: 'break-word'
                                        }}
                                    >
                                        {task.text}
                                    </span>
                                )}
                            </div>

                            {/* Borrar — aparece al hover */}
                            <button
                                onClick={() => { if (confirm('¿Borrar tarea?')) removeProjectTask(project.id, task.id); }}
                                style={{
                                    background: 'none', border: 'none', padding: '2px', cursor: 'pointer',
                                    color: '#C63C3C', opacity: hoveredTaskId === task.id ? 0.7 : 0,
                                    transition: 'opacity 0.15s', flexShrink: 0
                                }}
                            >
                                <Trash2 size={12} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Input nueva tarea */}
                {isAdding ? (
                    <form onSubmit={handleAddTask} style={{ padding: '6px 10px', display: 'flex', gap: '6px', alignItems: 'center', background: 'white', borderTop: '1px solid #DCE7E1' }}>
                        <input
                            autoFocus
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            onBlur={() => { if (!newTaskText.trim()) setIsAdding(false); }}
                            onKeyDown={(e) => { if (e.key === 'Escape') setIsAdding(false); }}
                            placeholder="Nueva tarea..."
                            style={{
                                flex: 1, border: 'none', borderBottom: `2px solid ${project.color}`,
                                background: 'transparent', padding: '4px 0', fontSize: '0.8rem',
                                fontWeight: 600, outline: 'none', color: 'var(--text-carbon)'
                            }}
                        />
                        <button type="submit" style={{ background: project.color, color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}>OK</button>
                    </form>
                ) : (
                    <button
                        onClick={() => setIsAdding(true)}
                        style={{
                            width: '100%', background: 'none', border: 'none',
                            color: '#6C8079', padding: '8px 10px',
                            fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '5px',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = project.color)}
                        onMouseLeave={e => (e.currentTarget.style.color = '#6C8079')}
                    >
                        <Plus size={13} /> Añadir tarea
                    </button>
                )}
            </div>
        </div>
    );
};
