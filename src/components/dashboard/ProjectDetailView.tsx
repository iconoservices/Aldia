import { useState, useMemo } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Edit2, GripVertical, CheckCircle2, Circle, Zap, X, FolderTree, Link, AlignLeft, CheckSquare, Type as TypeIcon, CreditCard, Calendar, Palette, Folder } from 'lucide-react';

import type { Project, Transaction, Routine } from '../../hooks/useAlDiaState';
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from '../../hooks/useAlDiaState';

const getDueDateColor = (dateStr: string | undefined, baseColor: string | undefined) => {
    if (!dateStr) return baseColor || '#94A3B8';
    try {
        const due = new Date(dateStr + 'T12:00:00'); // Midday to avoid TZ issues
        const today = new Date();
        today.setHours(0,0,0,0);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return '#ef4444'; // Rojo - Atrasado
        if (diffDays <= 1) return '#f97316'; // Naranja - Hoy/Mañana
        if (diffDays <= 3) return '#eab308'; // Amarillo - Pronto
        return baseColor || '#3b82f6';
    } catch { return baseColor || '#94A3B8'; }
};

const ModernPicker = ({ isOpen, onClose, onSave, data, anchorRect }: any) => {
    const [title, setTitle] = useState(data.title || '');
    const [date, setDate] = useState(data.dueDate || '');
    const [color, setColor] = useState(data.color || '#3b82f6');
    const [group, setGroup] = useState(data.group || '');

    if (!isOpen || !anchorRect) return null;

    const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            style={{
                position: 'fixed',
                top: Math.min(window.innerHeight - 250, anchorRect.bottom + 10),
                left: Math.max(20, Math.min(window.innerWidth - 220, anchorRect.left - 100)),
                zIndex: 1000,
                background: 'white',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                width: '200px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748B', textTransform: 'uppercase' }}>Editar Entrega</span>
                <X size={16} onClick={onClose} style={{ cursor: 'pointer', color: '#94A3B8' }} />
            </div>

            <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>TÍTULO</label>
                <input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', outline: 'none', background: '#F8FAFC' }}
                />
            </div>

            <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>FECHA</label>
                <input 
                    type="date"
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', outline: 'none', background: '#F8FAFC' }}
                />
            </div>

            <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>GRUPO</label>
                <input 
                    placeholder="Ventas, Backend..."
                    value={group} 
                    onChange={e => setGroup(e.target.value)}
                    style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', outline: 'none', background: '#F8FAFC' }}
                />
            </div>

            <div>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '4px' }}>COLOR</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {colors.map(c => (
                        <div 
                            key={c}
                            onClick={() => setColor(c)}
                            style={{ 
                                width: '20px', 
                                height: '20px', 
                                borderRadius: '50%', 
                                background: c, 
                                cursor: 'pointer',
                                border: color === c ? '2px solid #1e293b' : 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    ))}
                </div>
            </div>

            <button 
                onClick={() => onSave({ title, dueDate: date, color, group })}
                style={{ 
                    marginTop: '8px',
                    background: color, 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '10px', 
                    padding: '8px', 
                    fontWeight: 900, 
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                }}
            >
                GUARDAR CAMBIOS
            </button>
        </motion.div>
    );
};

const ProjectNodeItem = ({ project, objectiveId, node, updateProjectNode, removeProjectNode, addMission, onOpenPicker }: any) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleVal, setTitleVal] = useState(node.title);
    const [newSubTask, setNewSubTask] = useState('');

    const toggleType = (t: 'task'|'note'|'checklist') => {
        updateProjectNode(project.id, objectiveId, node.id, { type: t });
    };

    return (
        <div style={{ padding: '6px 0', borderBottom: '1px solid #F1F5F9', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ marginTop: '2px', cursor: 'pointer', display: 'flex' }} onClick={() => updateProjectNode(project.id, objectiveId, node.id, { completed: !node.completed })}>
                    {node.completed ? <CheckCircle2 size={16} color="var(--domain-green)" /> : <Circle size={16} color="#CBD5E1" />}
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {isEditingTitle ? (
                        <input
                            autoFocus
                            value={titleVal}
                            onChange={e => setTitleVal(e.target.value)}
                            onBlur={() => {
                                setIsEditingTitle(false);
                                if (titleVal.trim() !== node.title) {
                                    updateProjectNode(project.id, objectiveId, node.id, { title: titleVal.trim() });
                                }
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                            style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', outline: 'none', color: 'var(--text-carbon)', fontWeight: 700, padding: 0 }}
                        />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span 
                                onClick={() => setIsEditingTitle(true)}
                                style={{ fontSize: '0.85rem', color: node.completed ? '#94A3B8' : '#334155', fontWeight: 600, textDecoration: node.completed ? 'line-through' : 'none', cursor: 'text', minHeight: '18px', display: 'inline-block' }}
                            >
                                {node.title}
                            </span>
                            {node.dueDate && (
                                <span style={{ 
                                    fontSize: '0.6rem', 
                                    fontWeight: 900, 
                                    color: 'white', 
                                    background: getDueDateColor(node.dueDate, node.color), 
                                    padding: '1px 6px', 
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                }}>
                                    <Calendar size={8} /> {node.dueDate}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Inline Content based on Type */}
                    {(node.type === 'note' || node.type === 'checklist') && !node.completed && (
                        <div style={{ marginTop: '8px', paddingLeft: '8px', borderLeft: '2px solid #E2E8F0' }}>
                            {node.type === 'note' && (
                                <textarea
                                    defaultValue={node.content}
                                    onBlur={e => updateProjectNode(project.id, objectiveId, node.id, { content: e.target.value })}
                                    placeholder="Escribe notas, detalles o información aquí..."
                                    style={{ width: '100%', minHeight: '60px', border: 'none', background: '#F8FAFC', borderRadius: '8px', padding: '8px', fontSize: '0.8rem', color: '#64748B', outline: 'none', resize: 'vertical' }}
                                />
                            )}
                            {node.type === 'checklist' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {(node.subItems || []).map((sub: any) => (
                                        <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ cursor: 'pointer', display: 'flex' }} onClick={() => {
                                                const newSubs = node.subItems?.map((s:any) => s.id === sub.id ? { ...s, completed: !s.completed } : s);
                                                updateProjectNode(project.id, objectiveId, node.id, { subItems: newSubs });
                                            }}>
                                                {sub.completed ? <CheckCircle2 size={12} color="var(--domain-green)" /> : <Circle size={12} color="#CBD5E1" />}
                                            </div>
                                            <input 
                                                defaultValue={sub.text}
                                                onBlur={e => {
                                                    const newSubs = node.subItems?.map((s:any) => s.id === sub.id ? { ...s, text: e.target.value } : s);
                                                    updateProjectNode(project.id, objectiveId, node.id, { subItems: newSubs });
                                                }}
                                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.75rem', outline: 'none', color: sub.completed ? '#94A3B8' : '#475569', textDecoration: sub.completed ? 'line-through' : 'none' }}
                                            />
                                            <button onClick={() => {
                                                const newSubs = node.subItems?.filter((s:any) => s.id !== sub.id);
                                                updateProjectNode(project.id, objectiveId, node.id, { subItems: newSubs });
                                            }} style={{ background: 'transparent', border: 'none', color: '#E2E8F0', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                                        </div>
                                    ))}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                        <Plus size={12} color="#CBD5E1" />
                                        <input
                                            value={newSubTask}
                                            onChange={e => setNewSubTask(e.target.value)}
                                            onKeyDown={e => {
                                                if(e.key === 'Enter' && newSubTask.trim()) {
                                                    const newSubs = [...(node.subItems || []), { id: Date.now(), text: newSubTask.trim(), completed: false }];
                                                    updateProjectNode(project.id, objectiveId, node.id, { subItems: newSubs });
                                                    setNewSubTask('');
                                                }
                                            }}
                                            placeholder="Nueva tarea..."
                                            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.75rem', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right side Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.6 }}>
                    {node.type !== 'note' && <button onClick={() => toggleType('note')} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }} title="Convertir a Nota"><AlignLeft size={14} /></button>}
                    {node.type !== 'checklist' && <button onClick={() => toggleType('checklist')} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }} title="Convertir a Meta con Tareas"><CheckSquare size={14} /></button>}
                    {node.type !== 'task' && <button onClick={() => toggleType('task')} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }} title="Convertir a Meta Simple"><TypeIcon size={14} /></button>}
                    
                    <button 
                        onClick={() => {
                            if (addMission) {
                                addMission(node.title, '...', 'none', undefined, ['PROYECTO'], node.dueDate, undefined, project.id);
                                alert('¡Enviado a tu Agenda! 🚀');
                            }
                        }} 
                        style={{ background: 'transparent', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: 0 }}
                        title="Sincronizar con Agenda (Misión)"
                    ><Zap size={14} /></button>

                    <button 
                        onClick={(e) => onOpenPicker({ 
                            type: 'node', 
                            projectId: project.id, 
                            objectiveId, 
                            nodeId: node.id, 
                            anchorRect: e.currentTarget.getBoundingClientRect(),
                            data: { title: node.title, dueDate: node.dueDate, color: node.color } 
                        })} 
                        style={{ background: 'transparent', border: 'none', color: node.dueDate ? project.color : '#CBD5E1', cursor: 'pointer', padding: 0 }}
                        title="Configurar entrega"
                    ><Calendar size={14} /></button>
                    
                    <button 
                        onClick={() => {
                            const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];
                            const idx = prompt('Elegir Color:\n1. Azul\n2. Rojo\n3. Naranja\n4. Verde\n5. Morado') || '1';
                            const color = colors[parseInt(idx)-1] || colors[0];
                            updateProjectNode(project.id, objectiveId, node.id, { color });
                        }} 
                        style={{ background: 'transparent', border: 'none', color: node.color || '#CBD5E1', cursor: 'pointer', padding: 0 }}
                        title="Color de meta"
                    ><Palette size={14} /></button>

                    <button onClick={() => removeProjectNode(project.id, objectiveId, node.id)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, marginLeft: '6px' }} title="Borrar nodo"><Trash2 size={14} /></button>
                </div>
            </div>
        </div>
    );
};

interface ProjectDetailViewProps {
    project: Project;
    onClose: () => void;
    accounts: { id: number, name: string, color: string, projectIds?: number[] }[];
    setAccounts: (accounts: any) => void;
    transactions: Transaction[];
    addProjectTask: (projectId: number, text: string) => void;
    toggleProjectTask: (projectId: number, taskId: number) => void;
    removeProjectTask: (projectId: number, taskId: number) => void;
    updateProjectTask: (projectId: number, taskId: number, updates: Partial<{ text: string, completed: boolean }>) => void;
    reorderProjectTasks?: (projectId: number, newTasks: any[]) => void;
    promoteTaskToRoutine: (projectId: number, taskId: number, routineId: number) => void;
    removeRoutineItem?: (routineId: number, itemId: number) => void;
    rutinas: Routine[];
    addProjectCategory?: (projectId: number, type: 'ingreso' | 'gasto', categoryName: string) => void;
    removeProjectCategory?: (projectId: number, type: 'ingreso' | 'gasto', categoryName: string) => void;
    addInventoryItem?: (projectId: number, text: string, qty: number) => void;
    updateInventoryItemQuantity?: (projectId: number, itemId: number, delta: number) => void;
    removeInventoryItem?: (projectId: number, itemId: number) => void;
    projects: Project[];
    updateProject: (id: number, updates: Partial<Project>) => void;
    onOpenSubProject?: (id: number) => void;
    // --- Nuevo Sistema (Objetivos y Nodos) ---
    addProjectObjective?: (projectId: number, title: string) => void;
    updateProjectObjective?: (projectId: number, objectiveId: number, updates: any) => void;
    removeProjectObjective?: (projectId: number, objectiveId: number) => void;
    addProjectNode?: (projectId: number, objectiveId: number, title: string, type: 'task' | 'note' | 'checklist') => void;
    updateProjectNode?: (projectId: number, objectiveId: number, nodeId: number, updates: any) => void;
    removeProjectNode?: (projectId: number, objectiveId: number, nodeId: number) => void;
    addMission?: (text: string, q?: string, repeat?: 'none' | 'daily' | 'weekly' | 'monthly', noteId?: number, labels?: string[], dueDate?: string, dueTime?: string, projectId?: number) => void;
    onOpenPicker?: (picker: any) => void;
}

export const ProjectDetailView = ({ 
    project, onClose, accounts, setAccounts, transactions,
    addProjectTask, toggleProjectTask, removeProjectTask, 
    updateProjectTask, reorderProjectTasks, promoteTaskToRoutine, rutinas,
    removeRoutineItem, addProjectCategory, removeProjectCategory,
    addInventoryItem, updateInventoryItemQuantity, removeInventoryItem,
    projects, updateProject, onOpenSubProject,
    addProjectObjective, updateProjectObjective, removeProjectObjective,
    addProjectNode, updateProjectNode, removeProjectNode,
    addMission
}: ProjectDetailViewProps) => {
    const [newTaskText, setNewTaskText] = useState('');
    const [newItemText, setNewItemText] = useState('');
    const [newItemQty, setNewItemQty] = useState('0');
    const [activeTab, setActiveTab] = useState<'objectives' | 'inventory' | 'categorias' | 'subprojects' | 'accounts' | 'balance'>('objectives');
    const [categoryType, setCategoryType] = useState<'ingreso' | 'gasto'>('ingreso');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newObjectiveTitle, setNewObjectiveTitle] = useState('');
    const [activePicker, setActivePicker] = useState<any>(null);

    const projectAccounts = useMemo(() => {
        // Cuentas vinculadas explícitamente o que tienen transacciones para este proyecto
        const usedAccountIds = new Set(transactions.filter(tx => tx.projectId === project.id).map(tx => tx.accountId));
        
        return accounts
            .filter(acc => acc.projectIds?.includes(project.id) || usedAccountIds.has(acc.id))
            .map(acc => {
                const bal = transactions
                    .filter(tx => tx.accountId === acc.id && tx.projectId === project.id && !tx.isCashless)
                    .reduce((sum, tx) => sum + tx.amount, 0);
                return { ...acc, balance: bal };
            });
    }, [accounts, project.id, transactions]);

    const totalBalance = useMemo(() => projectAccounts.reduce((sum, acc) => sum + acc.balance, 0), [projectAccounts]);

    const handleAddTask = () => {
        if (newTaskText.trim()) {
            addProjectTask(project.id, newTaskText.trim());
            setNewTaskText('');
        }
    };



    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            style={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                background: '#F8F9FA', zIndex: 1000, 
                padding: '1.5rem', overflowY: 'auto',
                display: 'flex', flexDirection: 'column', gap: '1.5rem'
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={onClose} style={{ background: 'white', border: 'none', borderRadius: '12px', padding: '8px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <ArrowLeft size={20} />
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{project.name}</h2>
                        <div style={{ background: `${project.color}15`, padding: '4px 10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px', border: `1px solid ${project.color}33` }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: project.color }}>S/.{totalBalance.toLocaleString()}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: project.color }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#AAA', textTransform: 'uppercase' }}>PROYECTO DETALLE</span>
                    </div>
                </div>
            </div>

            {/* PARENT LINK IF EXISTS */}
            {project.parentId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F1F5F9', padding: '8px 12px', borderRadius: '12px', marginBottom: '0.5rem' }}>
                    <FolderTree size={14} color="#64748B" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B' }}>
                        Sub-proyecto de: <span style={{ color: 'var(--text-carbon)' }}>{projects.find(p => p.id === project.parentId)?.name || '...'}</span>
                    </span>
                    <button 
                        onClick={() => updateProject(project.id, { parentId: undefined })}
                        style={{ marginLeft: 'auto', background: 'white', border: '1px solid #EEE', borderRadius: '6px', padding: '2px 8px', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}
                    >X</button>
                </div>
            )}

            {/* Tabs Navigation - Grilla optimizada para 6 elementos (3x2) en iPhone 13 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '1rem', background: '#F1F5F9', padding: '6px', borderRadius: '16px' }}>
                {(['objectives', 'inventory', 'categorias', 'subprojects', 'accounts', 'balance'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 4px', borderRadius: '12px', border: 'none',
                            background: activeTab === tab ? 'white' : 'transparent',
                            color: activeTab === tab ? project.color : '#64748B',
                            fontWeight: 900, fontSize: '0.65rem', cursor: 'pointer',
                            boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>
                            {tab === 'objectives' ? '🎯' : 
                             tab === 'inventory' ? '📦' : 
                             tab === 'categorias' ? '🏷️' : 
                             tab === 'subprojects' ? '📂' : 
                             tab === 'accounts' ? '💳' : '💰'}
                        </span>
                        <span>
                            {tab === 'objectives' ? 'Plan' : 
                             tab === 'inventory' ? 'Stock' : 
                             tab === 'categorias' ? 'Tipos' : 
                             tab === 'subprojects' ? 'Hijos' : 
                             tab === 'accounts' ? 'Cuentas' : 'Saldo'}
                        </span>
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'objectives' && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* 1. Objetivos */}
                    <div style={{ padding: '0.5rem', background: 'transparent' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                                <input 
                                    placeholder="Nuevo objetivo..."
                                    value={newObjectiveTitle}
                                    onChange={(e) => setNewObjectiveTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newObjectiveTitle.trim() && addProjectObjective) {
                                            addProjectObjective(project.id, newObjectiveTitle.trim());
                                            setNewObjectiveTitle('');
                                        }
                                    }}
                                    style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 14px', fontSize: '0.9rem', outline: 'none', fontWeight: 700, background: '#F8FAFC' }}
                                />
                                <button 
                                    onClick={() => {
                                        if (newObjectiveTitle.trim() && addProjectObjective) {
                                            addProjectObjective(project.id, newObjectiveTitle.trim());
                                            setNewObjectiveTitle('');
                                        }
                                    }} 
                                    style={{ background: project.color, color: 'white', border: 'none', borderRadius: '10px', padding: '0 12px', cursor: 'pointer', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <Plus size={16} /> OBJETIVO
                                </button>
                            </div>
                            
                            {(() => {
                                const objectives = project.objectives || [];
                                const groups: { [key: string]: typeof objectives } = {};
                                
                                objectives.forEach(obj => {
                                    const g = obj.group || 'Sin Grupo';
                                    if (!groups[g]) groups[g] = [];
                                    groups[g].push(obj);
                                });

                                return Object.entries(groups).map(([groupName, groupObjs]) => (
                                    <div key={groupName} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        {groupName !== 'Sin Grupo' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: '#F1F5F9', borderRadius: '8px', width: 'fit-content', marginTop: '1rem' }}>
                                                <Folder size={12} color="#64748B" />
                                                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748B', textTransform: 'uppercase' }}>{groupName}</span>
                                            </div>
                                        )}
                                        
                                        {groupObjs.map(obj => (
                                            <div key={obj.id} style={{ 
                                                padding: '0 0 1rem 0',
                                                borderBottom: '1px dashed #E2E8F0',
                                                opacity: obj.completed ? 0.6 : 1
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div 
                                                            onClick={() => updateProjectObjective && updateProjectObjective(project.id, obj.id, { completed: !obj.completed })}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            {obj.completed ? <CheckCircle2 size={20} color={project.color} /> : <Circle size={20} color="#CBD5E1" />}
                                                        </div>
                                                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: obj.completed ? '#94A3B8' : 'var(--text-carbon)', textDecoration: obj.completed ? 'line-through' : 'none' }}>
                                                            {obj.title}
                                                        </h3>
                                                        {obj.dueDate && (
                                                            <span style={{ 
                                                                fontSize: '0.6rem', 
                                                                fontWeight: 900, 
                                                                color: 'white', 
                                                                background: getDueDateColor(obj.dueDate, obj.color), 
                                                                padding: '1px 6px', 
                                                                borderRadius: '4px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '2px'
                                                            }}>
                                                                <Calendar size={8} /> {obj.dueDate}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                        <button 
                                                            onClick={() => {
                                                                if (addMission) {
                                                                    addMission(obj.title, '...', 'none', undefined, ['PROYECTO', 'HITOS'], obj.dueDate, undefined, project.id);
                                                                    alert('¡Objetivo enviado a tu Agenda! 🚀');
                                                                }
                                                            }} 
                                                            style={{ background: 'transparent', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: 0 }}
                                                            title="Sincronizar Objetivo con Agenda"
                                                        ><Zap size={14} /></button>

                                                        <button 
                                                            onClick={(e) => setActivePicker({ 
                                                                type: 'objective', 
                                                                projectId: project.id, 
                                                                objectiveId: obj.id, 
                                                                anchorRect: e.currentTarget.getBoundingClientRect(),
                                                                data: { title: obj.title, dueDate: obj.dueDate, color: obj.color, group: obj.group } 
                                                            })} 
                                                            style={{ background: 'transparent', border: 'none', color: obj.dueDate || obj.group ? project.color : '#CBD5E1', cursor: 'pointer', padding: 0 }}
                                                            title="Configurar entrega/grupo"
                                                        ><Calendar size={14} /></button>

                                                        <button 
                                                            onClick={() => removeProjectObjective && window.confirm('¿Borrar objetivo y todas sus metas?') && removeProjectObjective(project.id, obj.id)}
                                                            style={{ background: 'transparent', border: 'none', color: '#CBD5E1', cursor: 'pointer', padding: '4px' }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Tareas del Objetivo (Nodos) */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '28px' }}>
                                                    {(obj.nodes || []).map(node => (
                                                        <ProjectNodeItem 
                                                            key={node.id}
                                                            project={project}
                                                            objectiveId={obj.id}
                                                            node={node}
                                                            updateProjectNode={updateProjectNode}
                                                            removeProjectNode={removeProjectNode}
                                                            addMission={addMission}
                                                            onOpenPicker={(p: any) => setActivePicker(p)}
                                                        />
                                                    ))}
                                                    
                                                    {/* Añadir mini-tarea al objetivo */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                                        <Plus size={14} color="#CBD5E1" />
                                                        <input 
                                                            placeholder="Agregar meta al objetivo..."
                                                            onKeyDown={(e) => {
                                                                const target = e.target as HTMLInputElement;
                                                                if (e.key === 'Enter' && target.value.trim() && addProjectNode) {
                                                                    addProjectNode(project.id, obj.id, target.value.trim(), 'task');
                                                                    target.value = '';
                                                                }
                                                            }}
                                                            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.8rem', outline: 'none', color: '#64748B' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* 2. Tareas Sueltas (Varios / Legacy Checklist) */}
                    <div style={{ padding: '0.5rem', marginTop: '1rem' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Tareas Sueltas</h4>
                        <Reorder.Group 
                            axis="y" 
                            values={project.checklist || []} 
                            onReorder={(newOrder: any) => reorderProjectTasks && reorderProjectTasks(project.id, newOrder)}
                            style={{ display: 'flex', flexDirection: 'column', gap: '6px', listStyle: 'none', padding: 0, margin: 0 }}
                        >
                            {(project.checklist || []).map((task: any) => (
                                <Reorder.Item key={task.id} value={task} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                                    <GripVertical size={14} color="#CBD5E1" style={{ cursor: 'grab' }} />
                                    <div onClick={() => toggleProjectTask(project.id, task.id)} style={{ cursor: 'pointer', display: 'flex' }}>
                                        {task.completed ? <CheckCircle2 size={16} color="var(--domain-green)" /> : <Circle size={16} color="#CBD5E1" />}
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.85rem', color: task.completed ? '#94A3B8' : '#334155', textDecoration: task.completed ? 'line-through' : 'none', fontWeight: 500 }}>
                                            {task.text}
                                        </span>
                                        {task.linkedRoutineId && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px', borderRadius: '4px', background: task.linkedRoutineItemId ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)', border: `1px solid ${task.linkedRoutineItemId ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)'}` }}>
                                                {task.linkedRoutineItemId ? <Zap size={8} color="#8b5cf6" strokeWidth={3} /> : <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3b82f6' }} />}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', opacity: 0.6 }}>
                                        <button onClick={() => { const t = prompt('Editar tarea:', task.text); if(t) updateProjectTask(project.id, task.id, { text: t }); }} style={{ background: 'transparent', border: 'none', color: '#CBD5E1', cursor: 'pointer', padding: 0 }}><Edit2 size={12} /></button>
                                        <button 
                                            onClick={() => {
                                                if (task.linkedRoutineId) { alert('Esta tarea ya está en tus Misiones 🔗'); } 
                                                else {
                                                    if (rutinas.length === 0) { alert('No tienes rutinas disponibles.'); return; }
                                                    if (rutinas.length === 1) { promoteTaskToRoutine(project.id, task.id, rutinas[0].id); } 
                                                    else {
                                                        const list = rutinas.map((r, i) => `${i+1}. ${r.title}`).join('\n');
                                                        const idxStr = prompt(`¿A qué rutina enviarla?\n${list}`);
                                                        const idx = parseInt(idxStr || '0') - 1;
                                                        if (rutinas[idx] && promoteTaskToRoutine) promoteTaskToRoutine(project.id, task.id, rutinas[idx].id);
                                                    }
                                                }
                                            }} 
                                            style={{ background: 'transparent', border: 'none', color: task.linkedRoutineId ? '#86efac' : '#CBD5E1', cursor: 'pointer', padding: 0 }}
                                        ><Zap size={12} /></button>
                                        <button 
                                            onClick={() => {
                                                if (task.linkedRoutineId && task.linkedRoutineItemId && removeRoutineItem) {
                                                    if(window.confirm('Esta tarea está en tus Misiones. ¿Borrarla también de allí?')) removeRoutineItem(task.linkedRoutineId, task.linkedRoutineItemId);
                                                }
                                                removeProjectTask(project.id, task.id);
                                            }} 
                                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, marginLeft: '4px' }}
                                        ><Trash2 size={12} /></button>
                                    </div>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <input 
                                placeholder="Agregar tarea suelta rápida..."
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                style={{ flex: 1, border: '1px dashed #CBD5E1', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', outline: 'none', background: 'transparent' }}
                            />
                            <button onClick={handleAddTask} style={{ background: '#E2E8F0', color: '#475569', border: 'none', borderRadius: '8px', padding: '0 10px', cursor: 'pointer' }}>
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* Sub Proyectos */}
            {activeTab === 'subprojects' && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #F1F5F9', paddingBottom: '8px', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>📂 Sub-proyectos</h3>
                            <button 
                                onClick={() => {
                                    const available = projects.filter(p => !p.parentId && p.id !== project.id);
                                    if (available.length === 0) { alert('No hay proyectos raíz disponibles para absorber.'); return; }
                                    const list = available.map((p, i) => `${i+1}. ${p.name}`).join('\n');
                                    const idxStr = prompt(`Selecciona proyecto para ABSORBER:\n${list}`);
                                    const idx = parseInt(idxStr || '0') - 1;
                                    if (available[idx]) updateProject(available[idx].id, { parentId: project.id });
                                }}
                                style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '4px 8px', fontSize: '0.6rem', fontWeight: 900, color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <Link size={10} /> ABSORBER
                            </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {projects.filter(p => p.parentId === project.id).map(sp => (
                                <div 
                                    key={sp.id} 
                                    onClick={() => onOpenSubProject && onOpenSubProject(sp.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #F1F5F9', cursor: 'pointer' }}
                                >
                                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: sp.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <FolderTree size={14} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h5 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{sp.name}</h5>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); updateProject(sp.id, { parentId: undefined }); }}
                                        style={{ background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '2px 6px', fontSize: '0.6rem', fontWeight: 800, color: '#94A3B8', cursor: 'pointer' }}
                                    >SOLTAR</button>
                                </div>
                            ))}
                            {projects.filter(p => p.parentId === project.id).length === 0 && (
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic' }}>No hay sub-proyectos.</p>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* Inventario */}
            {activeTab === 'inventory' && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 900, borderBottom: '2px solid #F1F5F9', paddingBottom: '8px' }}>📦 Inventario Rápido</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(project.inventoryItems || []).map((item: any) => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '6px 10px', borderRadius: '10px', border: `1px solid ${item.quantity === 0 ? '#FECACA' : '#F1F5F9'}` }}>
                                    <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: item.quantity === 0 ? '#EF4444' : '#334155' }}>
                                        {item.quantity === 0 ? '⚠️ ' : ''}{item.text}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button onClick={() => updateInventoryItemQuantity && updateInventoryItemQuantity(project.id, item.id, -1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                        <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 900, fontSize: '0.85rem', color: item.quantity === 0 ? '#EF4444' : project.color }}>{item.quantity}</span>
                                        <button onClick={() => updateInventoryItemQuantity && updateInventoryItemQuantity(project.id, item.id, 1)} style={{ width: '24px', height: '24px', borderRadius: '6px', border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                        <button onClick={() => removeInventoryItem && removeInventoryItem(project.id, item.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}><Trash2 size={12} color="#f87171" opacity={0.5} /></button>
                                    </div>
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                <input
                                    placeholder="Producto..."
                                    value={newItemText}
                                    onChange={e => setNewItemText(e.target.value)}
                                    style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px 10px', fontSize: '0.8rem', outline: 'none' }}
                                />
                                <input
                                    type="number" min="0" placeholder="Qty" value={newItemQty}
                                    onChange={e => setNewItemQty(e.target.value)}
                                    style={{ width: '50px', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '6px', fontSize: '0.8rem', outline: 'none', textAlign: 'center' }}
                                />
                                <button
                                    onClick={() => {
                                        if (newItemText.trim() && addInventoryItem) {
                                            addInventoryItem(project.id, newItemText.trim(), parseInt(newItemQty) || 0);
                                            setNewItemText(''); setNewItemQty('0');
                                        }
                                    }}
                                    style={{ background: '#E2E8F0', color: '#475569', border: 'none', borderRadius: '8px', padding: '0 10px', cursor: 'pointer' }}
                                ><Plus size={16} /></button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Categorías */}
            {activeTab === 'categorias' && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '1rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 900, borderBottom: '2px solid #F1F5F9', paddingBottom: '8px' }}>🏷️ Categorías Financieras</h3>
                        
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                            <button onClick={() => setCategoryType('ingreso')} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: 'none', background: categoryType === 'ingreso' ? '#16a34a' : '#F8FAFC', color: categoryType === 'ingreso' ? 'white' : '#64748B', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}>INGRESOS</button>
                            <button onClick={() => setCategoryType('gasto')} style={{ flex: 1, padding: '6px', borderRadius: '8px', border: 'none', background: categoryType === 'gasto' ? '#dc2626' : '#F8FAFC', color: categoryType === 'gasto' ? 'white' : '#64748B', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}>GASTOS</button>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                            <input 
                                placeholder="Nueva categoría..." 
                                value={newCategoryName} 
                                onChange={e => setNewCategoryName(e.target.value)} 
                                onKeyDown={e => {
                                    if(e.key === 'Enter' && newCategoryName.trim() && addProjectCategory) {
                                        addProjectCategory(project.id, categoryType, newCategoryName.trim());
                                        setNewCategoryName('');
                                    }
                                }}
                                style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.8rem', outline: 'none' }} 
                            />
                            <button 
                                onClick={() => {
                                    if(newCategoryName.trim() && addProjectCategory) {
                                        addProjectCategory(project.id, categoryType, newCategoryName.trim());
                                        setNewCategoryName('');
                                    }
                                }} 
                                style={{ background: '#E2E8F0', color: '#475569', border: 'none', borderRadius: '8px', padding: '0 10px', cursor: 'pointer' }}
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {(() => {
                                const defaults = categoryType === 'ingreso' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
                                const list = categoryType === 'ingreso' ? (project.incomeCategories ?? defaults) : (project.expenseCategories ?? defaults);
                                
                                if (list.length === 0) return <p style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic', width: '100%' }}>No hay categorías de {categoryType}.</p>;
                                
                                return list.map(cat => (
                                    <div key={cat} style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '4px 8px' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700 }}>{cat}</span>
                                        {removeProjectCategory && (
                                            <button 
                                                onClick={() => { if (window.confirm(`¿Eliminar la categoría "${cat}"?`)) removeProjectCategory(project.id, categoryType, cat); }} 
                                                style={{ background: 'transparent', border: 'none', marginLeft: '6px', cursor: 'pointer', padding: 0, color: '#f87171', display: 'flex' }}
                                            ><X size={10} /></button>
                                        )}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </section>
            )}
            {/* Cuentas */}
            {activeTab === 'accounts' && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #F1F5F9', paddingBottom: '8px', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>💳 Contenedores de Dinero</h3>
                            <button 
                                onClick={() => {
                                    const allAccounts = accounts || [];
                                    if (allAccounts.length === 0) { alert('No hay cuentas creadas aún.'); return; }
                                    const list = allAccounts.map((a, i) => `${i+1}. ${a.name}`).join('\n');
                                    const idxStr = prompt(`Selecciona cuenta para VINCULAR a este proyecto:\n${list}`);
                                    const idx = parseInt(idxStr || '0') - 1;
                                    if (allAccounts[idx]) {
                                        const target = allAccounts[idx];
                                        const currentIds = target.projectIds || [];
                                        if (currentIds.includes(project.id)) { alert('Esta cuenta ya está vinculada.'); return; }
                                        const newAccounts = allAccounts.map(a => 
                                            a.id === target.id ? { ...a, projectIds: [...currentIds, project.id] } : a
                                        );
                                        setAccounts(newAccounts);
                                    }
                                }}
                                style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '4px 8px', fontSize: '0.6rem', fontWeight: 900, color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <Plus size={10} /> VINCULAR
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(accounts || []).filter(a => a.projectIds?.includes(project.id)).map(acc => (
                                <div key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: acc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <CreditCard size={16} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{acc.name}</h5>
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>ID: {acc.id.toString().slice(-4)}</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const newAccounts = accounts.map(a => 
                                                a.id === acc.id ? { ...a, projectIds: (a.projectIds || []).filter(pid => pid !== project.id) } : a
                                            );
                                            setAccounts(newAccounts);
                                        }}
                                        style={{ background: 'transparent', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '2px 6px', fontSize: '0.6rem', fontWeight: 800, color: '#f87171', cursor: 'pointer' }}
                                    >DESVINCULAR</button>
                                </div>
                            ))}
                            {(accounts || []).filter(a => a.projectIds?.includes(project.id)).length === 0 && (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '2px dashed #F1F5F9', borderRadius: '16px' }}>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>No hay cuentas vinculadas a este proyecto.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}
            {/* Saldo y Transacciones */}
            {activeTab === 'balance' && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '1rem' }}>
                        <div style={{ background: project.color, padding: '1.5rem', borderRadius: '18px', color: 'white', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '1rem', boxShadow: `0 8px 16px -4px ${project.color}44` }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 900, opacity: 0.8, textTransform: 'uppercase' }}>Balance del Proyecto</span>
                            <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>
                                ${transactions.filter(t => t.projectId === project.id && !t.isCashless).reduce((acc, t) => acc + t.amount, 0).toLocaleString()}
                            </h2>
                        </div>

                        <h4 style={{ margin: '1rem 0 10px 0', fontSize: '0.85rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Historial del Proyecto</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {transactions.filter(t => t.projectId === project.id).slice(0, 15).map(tx => (
                                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #F1F5F9' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: tx.amount > 0 ? '#DCFCE7' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tx.amount > 0 ? '#16A34A' : '#DC2626' }}>
                                        {tx.amount > 0 ? <Plus size={14} /> : <Trash2 size={14} style={{ transform: 'rotate(45deg)' }} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>{tx.text}</h5>
                                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#94A3B8' }}>{tx.date} • {tx.category || 'Sin categoría'}</p>
                                    </div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: tx.amount > 0 ? '#16A34A' : '#DC2626' }}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                            {transactions.filter(t => t.projectId === project.id).length === 0 && (
                                <p style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center' }}>No hay transacciones registradas.</p>
                            )}
                        </div>
                    </div>
                </section>
            )}
            {/* MODAL / PICKER OVERLAY */}
            <AnimatePresence>
                {activePicker && (
                    <ModernPicker 
                        isOpen={true}
                        anchorRect={activePicker.anchorRect}
                        data={activePicker.data}
                        onClose={() => setActivePicker(null)}
                        onSave={(updates: any) => {
                            if (activePicker.type === 'objective') {
                                if (updateProjectObjective) updateProjectObjective(activePicker.projectId, activePicker.objectiveId, updates);
                            } else {
                                if (updateProjectNode) updateProjectNode(activePicker.projectId, activePicker.objectiveId, activePicker.nodeId, updates);
                            }
                            setActivePicker(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
};
