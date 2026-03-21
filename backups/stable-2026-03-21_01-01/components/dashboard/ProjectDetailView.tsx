import { useState, useMemo } from 'react';
import { motion, Reorder } from 'framer-motion';
import { ArrowLeft, Package, Plus, Trash2, Edit2, GripVertical, CheckCircle2, Circle, Zap, Wallet, X } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import type { Project, Transaction, Routine } from '../../hooks/useAlDiaState';

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
    rutinas: Routine[];
    addInventoryItem?: (projectId: number, text: string, qty: number) => void;
    updateInventoryItemQuantity?: (projectId: number, itemId: number, delta: number) => void;
    removeInventoryItem?: (projectId: number, itemId: number) => void;
}

export const ProjectDetailView = ({ 
    project, onClose, accounts, setAccounts, transactions,
    addProjectTask, toggleProjectTask, removeProjectTask, 
    updateProjectTask, reorderProjectTasks, promoteTaskToRoutine, rutinas,
    addInventoryItem, updateInventoryItemQuantity, removeInventoryItem
}: ProjectDetailViewProps) => {
    const [newTaskText, setNewTaskText] = useState('');
    const [newItemText, setNewItemText] = useState('');
    const [newItemQty, setNewItemQty] = useState('0');
    const [activeTab, setActiveTab] = useState<'checklist' | 'inventory'>('checklist');

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

    const handleAddAccount = () => {
        const option = prompt('¿Qué tipo de acción?\n1. Crear nueva cuenta\n2. Enlazar cuenta existente');
        if (option === '1') {
            const name = prompt('Nombre de la cuenta (ej: BCP, Yape, Efectivo):');
            if (name) {
                const newAccount = { 
                    id: Date.now(), 
                    name, 
                    color: '#'+Math.floor(Math.random()*16777215).toString(16), 
                    projectIds: [project.id] 
                };
                setAccounts([...accounts, newAccount]);
            }
        } else if (option === '2') {
            const available = accounts.filter(acc => !acc.projectIds?.includes(project.id));
            if (available.length === 0) {
                alert('No hay otras cuentas para enlazar.');
                return;
            }
            const list = available.map((acc, i) => `${i+1}. ${acc.name}`).join('\n');
            const idxStr = prompt(`Selecciona una cuenta para enlazar:\n${list}`);
            const idx = parseInt(idxStr || '0') - 1;
            if (available[idx]) {
                const target = available[idx];
                const updated = accounts.map(acc => 
                    acc.id === target.id 
                        ? { ...acc, projectIds: [...(acc.projectIds || []), project.id] } 
                        : acc
                );
                setAccounts(updated);
            }
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
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-carbon)' }}>{project.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: project.color }} />
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#AAA', textTransform: 'uppercase' }}>PROYECTO DETALLE</span>
                    </div>
                </div>
            </div>

            {/* Finance Card */}
            <GlassCard 
                style={{ 
                    background: `${project.color}15`, 
                    borderLeft: `6px solid ${project.color}`,
                    padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
            >
                <div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6, textTransform: 'uppercase' }}>Saldos de este Proyecto</span>
                    <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>S/.{totalBalance.toLocaleString()}</h3>
                </div>
                <div style={{ background: 'white', padding: '10px', borderRadius: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <Wallet size={24} color={project.color} />
                </div>
            </GlassCard>

            {/* Accounts/Containers Section */}
            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900 }}>💳 Contenedores de Dinero</h3>
                    <button 
                        onClick={handleAddAccount}
                        style={{ background: 'white', border: '1px solid #EEE', borderRadius: '8px', padding: '4px 10px', fontSize: '0.65rem', fontWeight: 900, color: project.color, cursor: 'pointer' }}
                    >+ NUEVO</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {projectAccounts.map(acc => (
                        <div key={acc.id} className="glass-card" style={{ padding: '1rem 1.2rem', borderLeft: `6px solid ${acc.color}`, background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#AAA', textTransform: 'uppercase' }}>{acc.name}</span>
                                <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-carbon)' }}>S/.{acc.balance.toLocaleString()}</h4>
                            </div>
                            <button 
                                    onClick={() => { 
                                        if (acc.projectIds && acc.projectIds.length > 1) {
                                            if (confirm(`¿Desvincular ${acc.name} de este proyecto? Se mantendrá en los demás.`)) {
                                                const updated = accounts.map(a => 
                                                    a.id === acc.id 
                                                        ? { ...a, projectIds: a.projectIds?.filter(id => id !== project.id) } 
                                                        : a
                                                );
                                                setAccounts(updated);
                                            }
                                        } else {
                                            if (confirm(`¿Eliminar la cuenta ${acc.name} permanentemente?`)) {
                                                setAccounts(accounts.filter(a => a.id !== acc.id)); 
                                            }
                                        }
                                    }}
                                    style={{ background: 'transparent', border: 'none', padding: 0, color: '#DDD', cursor: 'pointer' }}
                                >
                                    <X size={10} />
                                </button>
                        </div>
                    ))}
                    {projectAccounts.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '1.5rem', background: 'white', borderRadius: '16px', border: '2px dashed #EEE' }}>
                            <p style={{ color: '#AAA', fontSize: '0.75rem', fontWeight: 700 }}>No hay cuentas vinculadas a este proyecto.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Tabs: Checklist / Inventario */}
            <section style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', background: '#F1F5F9', padding: '4px', borderRadius: '14px' }}>
                    {(['checklist', 'inventory'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1, padding: '8px', borderRadius: '10px', border: 'none',
                                background: activeTab === tab ? 'white' : 'transparent',
                                color: activeTab === tab ? project.color : '#64748B',
                                fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer',
                                boxShadow: activeTab === tab ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                            }}
                        >
                            {tab === 'checklist' ? '📝 Checklist' : '📦 Inventario'}
                        </button>
                    ))}
                </div>

                {activeTab === 'checklist' ? (
                    <div className="glass-card" style={{ padding: '1rem', background: 'white' }}>
                        <Reorder.Group 
                            axis="y" 
                            values={project.checklist || []} 
                            onReorder={(newOrder: any) => reorderProjectTasks && reorderProjectTasks(project.id, newOrder)}
                            style={{ display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'none', padding: 0 }}
                        >
                            {(project.checklist || []).map((task: any) => (
                                <Reorder.Item key={task.id} value={task} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', padding: '8px 12px', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                                    <GripVertical size={14} color="#CBD5E1" style={{ cursor: 'grab' }} />
                                    <div onClick={() => toggleProjectTask(project.id, task.id)} style={{ cursor: 'pointer', display: 'flex' }}>
                                        {task.completed ? <CheckCircle2 size={18} color="var(--domain-green)" /> : <Circle size={18} color="#CBD5E1" />}
                                    </div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, flex: 1, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#94A3B8' : '#1E293B' }}>{task.text}</span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button onClick={() => { const t = prompt('Editar tarea:', task.text); if(t) updateProjectTask(project.id, task.id, { text: t }); }} style={{ background: 'transparent', border: 'none', color: '#CBD5E1', cursor: 'pointer' }}><Edit2 size={12} /></button>
                                        <button onClick={() => { const rid = rutinas[0]?.id || Date.now(); promoteTaskToRoutine(project.id, task.id, rid); }} style={{ background: 'transparent', border: 'none', color: '#CBD5E1', cursor: 'pointer' }}><Zap size={12} /></button>
                                        <button onClick={() => removeProjectTask(project.id, task.id)} style={{ background: 'transparent', border: 'none', color: '#CBD5E1', cursor: 'pointer' }}><Trash2 size={12} /></button>
                                    </div>
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
                            <input 
                                placeholder="Nueva tarea del proyecto..."
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 12px', fontSize: '0.8rem', outline: 'none' }}
                            />
                            <button onClick={handleAddTask} style={{ background: project.color, color: 'white', border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer' }}>
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* INVENTARIO LIGERO */
                    <div className="glass-card" style={{ padding: '1rem', background: 'white' }}>
                        {(project.inventoryItems || []).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#CBD5E1' }}>
                                <Package size={40} style={{ marginBottom: '8px' }} />
                                <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>No hay productos aún. ¡Agrega el primero!</p>
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                            {(project.inventoryItems || []).map((item: any) => (
                                <div key={item.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    background: '#F8FAFC', padding: '10px 12px', borderRadius: '14px',
                                    border: `1px solid ${item.quantity === 0 ? '#FECACA' : '#F1F5F9'}`
                                }}>
                                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 700, color: item.quantity === 0 ? '#EF4444' : '#1E293B' }}>
                                        {item.quantity === 0 ? '⚠️ ' : ''}{item.text}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            onClick={() => updateInventoryItemQuantity && updateInventoryItemQuantity(project.id, item.id, -1)}
                                            style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >−</button>
                                        <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: 900, fontSize: '1rem', color: item.quantity === 0 ? '#EF4444' : project.color }}>{item.quantity}</span>
                                        <button
                                            onClick={() => updateInventoryItemQuantity && updateInventoryItemQuantity(project.id, item.id, 1)}
                                            style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontWeight: 900, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >+</button>
                                        <button
                                            onClick={() => removeInventoryItem && removeInventoryItem(project.id, item.id)}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                                        ><Trash2 size={12} color="#f87171" opacity={0.5} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Add new item form */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingTop: '12px', borderTop: '1px dashed #EEE', alignItems: 'center' }}>
                            <input
                                placeholder="Producto (ej: Perlas azules)"
                                value={newItemText}
                                onChange={e => setNewItemText(e.target.value)}
                                style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 12px', fontSize: '0.8rem', outline: 'none' }}
                            />
                            <input
                                type="number" min="0"
                                placeholder="Qty"
                                value={newItemQty}
                                onChange={e => setNewItemQty(e.target.value)}
                                style={{ width: '60px', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px', fontSize: '0.8rem', outline: 'none', textAlign: 'center' }}
                            />
                            <button
                                onClick={() => {
                                    if (newItemText.trim() && addInventoryItem) {
                                        addInventoryItem(project.id, newItemText.trim(), parseInt(newItemQty) || 0);
                                        setNewItemText('');
                                        setNewItemQty('0');
                                    }
                                }}
                                style={{ background: project.color, color: 'white', border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer' }}
                            ><Plus size={18} /></button>
                        </div>
                    </div>
                )}
            </section>
        </motion.div>
    );
};
