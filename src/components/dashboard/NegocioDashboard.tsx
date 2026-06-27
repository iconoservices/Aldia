import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Users, UserCheck, DollarSign, TrendingUp, TrendingDown, Briefcase, ChevronDown, ChevronUp, Edit3, X, Check } from 'lucide-react';
import type { NegocioProject, NegocioClient, NegocioWorker, NegocioExpense } from '../../hooks/state/useNegocioState';

interface Props {
    negocioProjects: NegocioProject[];
    addNegocioProject: (name: string, color: string) => void;
    removeNegocioProject: (id: number) => void;
    updateNegocioProject: (id: number, updates: Partial<NegocioProject>) => void;
    addClient: (projectId: number, name: string, monthlyPayment: number, myEarning: number) => void;
    updateClient: (projectId: number, clientId: number, updates: Partial<NegocioClient>) => void;
    removeClient: (projectId: number, clientId: number) => void;
    addWorker: (projectId: number, name: string, role: string, monthlySalary: number) => void;
    updateWorker: (projectId: number, workerId: number, updates: Partial<NegocioWorker>) => void;
    removeWorker: (projectId: number, workerId: number) => void;
    addExpense: (projectId: number, text: string, amount: number) => void;
    updateExpense: (projectId: number, expenseId: number, updates: Partial<NegocioExpense>) => void;
    removeExpense: (projectId: number, expenseId: number) => void;
}

const COLORS = ['#FF8C42', '#4D96FF', '#06D6A0', '#F72585', '#7209B7', '#3A0CA3', '#4CC9F0', '#F94144', '#90BE6D', '#F9C74F'];

const fmt = (n: number) => n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const NegocioDashboard = ({
    negocioProjects, addNegocioProject, removeNegocioProject, updateNegocioProject,
    addClient, updateClient, removeClient,
    addWorker, updateWorker, removeWorker,
    addExpense, updateExpense, removeExpense
}: Props) => {
    const [expandedProject, setExpandedProject] = useState<number | null>(null);
    const [addingProject, setAddingProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectColor, setNewProjectColor] = useState(COLORS[0]);

    const [addingType, setAddingType] = useState<'client' | 'worker' | 'expense' | null>(null);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPayment, setNewClientPayment] = useState('');
    const [newClientEarning, setNewClientEarning] = useState('');
    const [newWorkerName, setNewWorkerName] = useState('');
    const [newWorkerRole, setNewWorkerRole] = useState('');
    const [newWorkerSalary, setNewWorkerSalary] = useState('');
    const [newExpenseText, setNewExpenseText] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState('');

    const [editingId, setEditingId] = useState<{ type: 'client' | 'worker' | 'expense'; id: number } | null>(null);
    const [editValue, setEditValue] = useState<any>({});

    const resetForm = () => {
        setAddingType(null);
        setNewClientName(''); setNewClientPayment(''); setNewClientEarning('');
        setNewWorkerName(''); setNewWorkerRole(''); setNewWorkerSalary('');
        setNewExpenseText(''); setNewExpenseAmount('');
    };

    const handleAddProject = () => {
        if (!newProjectName.trim()) return;
        addNegocioProject(newProjectName.trim(), newProjectColor);
        setNewProjectName('');
        setNewProjectColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
        setAddingProject(false);
    };

    const handleAddClient = (projectId: number) => {
        if (!newClientName.trim() || !newClientPayment) return;
        addClient(projectId, newClientName.trim(), parseFloat(newClientPayment) || 0, parseFloat(newClientEarning) || 0);
        resetForm();
    };

    const handleAddWorker = (projectId: number) => {
        if (!newWorkerName.trim() || !newWorkerSalary) return;
        addWorker(projectId, newWorkerName.trim(), newWorkerRole.trim() || 'Trabajador', parseFloat(newWorkerSalary) || 0);
        resetForm();
    };

    const handleAddExpense = (projectId: number) => {
        if (!newExpenseText.trim() || !newExpenseAmount) return;
        addExpense(projectId, newExpenseText.trim(), parseFloat(newExpenseAmount) || 0);
        resetForm();
    };

    const startEdit = (type: 'client' | 'worker' | 'expense', item: any) => {
        setEditingId({ type, id: item.id });
        setEditValue({ ...item });
    };

    const saveEdit = (projectId: number) => {
        if (!editingId) return;
        if (editingId.type === 'client') updateClient(projectId, editingId.id, editValue);
        else if (editingId.type === 'worker') updateWorker(projectId, editingId.id, editValue);
        else if (editingId.type === 'expense') updateExpense(projectId, editingId.id, editValue);
        setEditingId(null);
        setEditValue({});
    };

    const selectedProject = negocioProjects.find(p => p.id === expandedProject);

    const calcProject = (p: NegocioProject) => {
        const totalIncome = p.clients.reduce((s, c) => s + c.monthlyPayment, 0);
        const totalMyEarnings = p.clients.reduce((s, c) => s + c.myEarning, 0);
        const totalSalaries = p.workers.reduce((s, w) => s + w.monthlySalary, 0);
        const totalExpenses = p.expenses.reduce((s, e) => s + e.amount, 0);
        const totalOut = totalSalaries + totalExpenses;
        const net = totalIncome - totalOut;
        const profitPerClient = p.clients.length > 0 ? totalMyEarnings - (totalOut / p.clients.length) : 0;
        return { totalIncome, totalMyEarnings, totalSalaries, totalExpenses, totalOut, net, profitPerClient };
    };

    const globalTotals = negocioProjects.reduce((acc, p) => {
        const c = calcProject(p);
        return {
            totalIncome: acc.totalIncome + c.totalIncome,
            totalMyEarnings: acc.totalMyEarnings + c.totalMyEarnings,
            totalSalaries: acc.totalSalaries + c.totalSalaries,
            totalExpenses: acc.totalExpenses + c.totalExpenses,
            totalOut: acc.totalOut + c.totalOut,
            net: acc.net + c.net
        };
    }, { totalIncome: 0, totalMyEarnings: 0, totalSalaries: 0, totalExpenses: 0, totalOut: 0, net: 0 });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '900px', margin: '0 auto', padding: '0 0 2rem' }}>
            {/* ── Global Summary (Octopus) ── */}
            {negocioProjects.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                        borderRadius: '24px',
                        padding: '2rem',
                        color: '#fff',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'radial-gradient(circle at 50% 50%, rgba(255,140,66,0.12) 0%, transparent 70%)',
                        pointerEvents: 'none'
                    }} />

                    <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>
                        Resumen Global
                    </h2>

                    {/* Center: Net result */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
                        <div style={{
                            width: '120px', height: '120px', borderRadius: '50%',
                            background: globalTotals.net >= 0
                                ? 'radial-gradient(circle, rgba(6,214,160,0.3) 0%, rgba(6,214,160,0.08) 100%)'
                                : 'radial-gradient(circle, rgba(249,65,68,0.3) 0%, rgba(249,65,68,0.08) 100%)',
                            border: `2px solid ${globalTotals.net >= 0 ? 'rgba(6,214,160,0.5)' : 'rgba(249,65,68,0.5)'}`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            boxShadow: globalTotals.net >= 0
                                ? '0 0 40px rgba(6,214,160,0.2)'
                                : '0 0 40px rgba(249,65,68,0.2)'
                        }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Resultado</span>
                            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: globalTotals.net >= 0 ? '#06D6A0' : '#F94144' }}>
                                S/ {fmt(globalTotals.net)}
                            </span>
                            <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>neto/mes</span>
                        </div>
                    </div>

                    {/* Branches: Income (up) and Expenses (down) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', position: 'relative', zIndex: 1 }}>
                        {/* Income Branch */}
                        <div style={{
                            background: 'rgba(6,214,160,0.08)', borderRadius: '16px', padding: '1rem',
                            border: '1px solid rgba(6,214,160,0.15)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                                <TrendingUp size={16} color="#06D6A0" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingresos</span>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#06D6A0', marginBottom: '0.25rem' }}>S/ {fmt(globalTotals.totalIncome)}</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                                Tu ganancia: <span style={{ color: '#4CC9F0', fontWeight: 700 }}>S/ {fmt(globalTotals.totalMyEarnings)}</span>
                            </div>
                            {negocioProjects.map(p => p.clients.map(c => (
                                <div key={c.id} style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{c.name}</span>
                                    <span style={{ color: 'rgba(6,214,160,0.7)' }}>+{fmt(c.monthlyPayment)}</span>
                                </div>
                            )))}
                        </div>

                        {/* Expense Branch */}
                        <div style={{
                            background: 'rgba(249,65,68,0.08)', borderRadius: '16px', padding: '1rem',
                            border: '1px solid rgba(249,65,68,0.15)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                                <TrendingDown size={16} color="#F94144" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gastos</span>
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#F94144', marginBottom: '0.25rem' }}>S/ {fmt(globalTotals.totalOut)}</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                                Salarios: <span style={{ color: 'rgba(249,65,68,0.8)' }}>S/ {fmt(globalTotals.totalSalaries)}</span>
                                {' '}| Gastos: <span style={{ color: 'rgba(249,65,68,0.8)' }}>S/ {fmt(globalTotals.totalExpenses)}</span>
                            </div>
                            {negocioProjects.map(p => p.workers.map(w => (
                                <div key={w.id} style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{w.name} <span style={{ opacity: 0.5 }}>({w.role})</span></span>
                                    <span style={{ color: 'rgba(249,65,68,0.7)' }}>-{fmt(w.monthlySalary)}</span>
                                </div>
                            )))}
                            {negocioProjects.map(p => p.expenses.map(e => (
                                <div key={e.id} style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{e.text}</span>
                                    <span style={{ color: 'rgba(249,65,68,0.7)' }}>-{fmt(e.amount)}</span>
                                </div>
                            )))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Project Cards ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {negocioProjects.map(project => {
                    const calc = calcProject(project);
                    const isExpanded = expandedProject === project.id;

                    return (
                        <motion.div
                            key={project.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: '#fff',
                                borderRadius: '20px',
                                overflow: 'hidden',
                                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                                border: `2px solid ${isExpanded ? project.color : 'transparent'}`,
                                transition: 'border-color 0.2s'
                            }}
                        >
                            {/* Project Header */}
                            <div
                                onClick={() => { setExpandedProject(isExpanded ? null : project.id); resetForm(); setEditingId(null); }}
                                style={{
                                    padding: '1.25rem 1.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    transition: 'background 0.15s'
                                }}
                            >
                                <div style={{
                                    width: '44px', height: '44px', borderRadius: '14px',
                                    background: `${project.color}18`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Briefcase size={22} color={project.color} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-carbon)' }}>{project.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '2px' }}>
                                        {project.clients.length} cliente{project.clients.length !== 1 ? 's' : ''} · {project.workers.length} trabajador{project.workers.length !== 1 ? 'es' : ''} · {project.expenses.length} gasto{project.expenses.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: calc.net >= 0 ? '#06D6A0' : '#F94144' }}>
                                        S/ {fmt(calc.net)}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: '#aaa' }}>neto/mes</div>
                                </div>
                                <div style={{ color: '#aaa', display: 'flex', alignItems: 'center' }}>
                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.25 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                                            {/* Mini Summary */}
                                            <div style={{
                                                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem',
                                                padding: '1rem', borderRadius: '16px',
                                                background: `linear-gradient(135deg, ${project.color}08 0%, ${project.color}03 100%)`,
                                                border: `1px solid ${project.color}15`
                                            }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingresos</div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#06D6A0' }}>S/ {fmt(calc.totalIncome)}</div>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gastos</div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#F94144' }}>S/ {fmt(calc.totalOut)}</div>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mi Ganancia</div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#4D96FF' }}>S/ {fmt(calc.totalMyEarnings)}</div>
                                                </div>
                                            </div>

                                            {/* Per-Client Profit */}
                                            {project.clients.length > 0 && (
                                                <div>
                                                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ganancia por Cliente</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {project.clients.map(client => {
                                                            const clientCostShare = calc.totalOut / Math.max(project.clients.length, 1);
                                                            const clientProfit = client.myEarning - clientCostShare;
                                                            return (
                                                                <div key={client.id} style={{
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    padding: '0.5rem 0.75rem', borderRadius: '10px',
                                                                    background: 'var(--bg-cream, #FDF8F5)', fontSize: '0.8rem'
                                                                }}>
                                                                    <span style={{ fontWeight: 600 }}>{client.name}</span>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <span style={{ fontSize: '0.7rem', color: '#aaa' }}>Paga {fmt(client.monthlyPayment)} · Ganas {fmt(client.myEarning)}</span>
                                                                        <span style={{ fontWeight: 800, color: clientProfit >= 0 ? '#06D6A0' : '#F94144' }}>
                                                                            S/ {fmt(clientProfit)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Clients Section ── */}
                                            <Section
                                                title="Clientes"
                                                icon={<DollarSign size={16} color="#06D6A0" />}
                                                color="#06D6A0"
                                                count={project.clients.length}
                                                onAdd={() => { resetForm(); setAddingType('client'); }}
                                            >
                                                {project.clients.map(client => (
                                                    editingId?.type === 'client' && editingId.id === client.id ? (
                                                        <InlineEdit
                                                            key={client.id}
                                                            fields={[
                                                                { key: 'name', label: 'Nombre', value: editValue.name },
                                                                { key: 'monthlyPayment', label: 'Pago mensual', value: editValue.monthlyPayment, type: 'number' },
                                                                { key: 'myEarning', label: 'Mi ganancia', value: editValue.myEarning, type: 'number' },
                                                            ]}
                                                            editValue={editValue}
                                                            setEditValue={setEditValue}
                                                            onSave={() => saveEdit(project.id)}
                                                            onCancel={() => { setEditingId(null); setEditValue({}); }}
                                                        />
                                                    ) : (
                                                        <ItemRow
                                                            key={client.id}
                                                            label={client.name}
                                                            sublabel={`Paga S/${fmt(client.monthlyPayment)} · Ganas S/${fmt(client.myEarning)}`}
                                                            amount={client.monthlyPayment}
                                                            amountColor="#06D6A0"
                                                            onEdit={() => startEdit('client', client)}
                                                            onRemove={() => removeClient(project.id, client.id)}
                                                        />
                                                    )
                                                ))}
                                                {addingType === 'client' && (
                                                    <AddForm
                                                        fields={[
                                                            { key: 'name', label: 'Nombre', value: newClientName, set: setNewClientName },
                                                            { key: 'monthlyPayment', label: 'Pago mensual', value: newClientPayment, set: setNewClientPayment, type: 'number' },
                                                            { key: 'myEarning', label: 'Mi ganancia', value: newClientEarning, set: setNewClientEarning, type: 'number' },
                                                        ]}
                                                        onAdd={() => handleAddClient(project.id)}
                                                        onCancel={resetForm}
                                                    />
                                                )}
                                            </Section>

                                            {/* ── Workers Section ── */}
                                            <Section
                                                title="Equipo"
                                                icon={<UserCheck size={16} color="#4D96FF" />}
                                                color="#4D96FF"
                                                count={project.workers.length}
                                                onAdd={() => { resetForm(); setAddingType('worker'); }}
                                            >
                                                {project.workers.map(worker => (
                                                    editingId?.type === 'worker' && editingId.id === worker.id ? (
                                                        <InlineEdit
                                                            key={worker.id}
                                                            fields={[
                                                                { key: 'name', label: 'Nombre', value: editValue.name },
                                                                { key: 'role', label: 'Rol', value: editValue.role },
                                                                { key: 'monthlySalary', label: 'Salario mensual', value: editValue.monthlySalary, type: 'number' },
                                                            ]}
                                                            editValue={editValue}
                                                            setEditValue={setEditValue}
                                                            onSave={() => saveEdit(project.id)}
                                                            onCancel={() => { setEditingId(null); setEditValue({}); }}
                                                        />
                                                    ) : (
                                                        <ItemRow
                                                            key={worker.id}
                                                            label={worker.name}
                                                            sublabel={worker.role}
                                                            amount={worker.monthlySalary}
                                                            amountColor="#F94144"
                                                            onEdit={() => startEdit('worker', worker)}
                                                            onRemove={() => removeWorker(project.id, worker.id)}
                                                        />
                                                    )
                                                ))}
                                                {addingType === 'worker' && (
                                                    <AddForm
                                                        fields={[
                                                            { key: 'name', label: 'Nombre', value: newWorkerName, set: setNewWorkerName },
                                                            { key: 'role', label: 'Rol (Diseñador, Freelance...)', value: newWorkerRole, set: setNewWorkerRole },
                                                            { key: 'monthlySalary', label: 'Salario mensual', value: newWorkerSalary, set: setNewWorkerSalary, type: 'number' },
                                                        ]}
                                                        onAdd={() => handleAddWorker(project.id)}
                                                        onCancel={resetForm}
                                                    />
                                                )}
                                            </Section>

                                            {/* ── Expenses Section ── */}
                                            <Section
                                                title="Gastos"
                                                icon={<TrendingDown size={16} color="#F94144" />}
                                                color="#F94144"
                                                count={project.expenses.length}
                                                onAdd={() => { resetForm(); setAddingType('expense'); }}
                                            >
                                                {project.expenses.map(expense => (
                                                    editingId?.type === 'expense' && editingId.id === expense.id ? (
                                                        <InlineEdit
                                                            key={expense.id}
                                                            fields={[
                                                                { key: 'text', label: 'Descripción', value: editValue.text },
                                                                { key: 'amount', label: 'Monto', value: editValue.amount, type: 'number' },
                                                            ]}
                                                            editValue={editValue}
                                                            setEditValue={setEditValue}
                                                            onSave={() => saveEdit(project.id)}
                                                            onCancel={() => { setEditingId(null); setEditValue({}); }}
                                                        />
                                                    ) : (
                                                        <ItemRow
                                                            key={expense.id}
                                                            label={expense.text}
                                                            amount={expense.amount}
                                                            amountColor="#F94144"
                                                            onEdit={() => startEdit('expense', expense)}
                                                            onRemove={() => removeExpense(project.id, expense.id)}
                                                        />
                                                    )
                                                ))}
                                                {addingType === 'expense' && (
                                                    <AddForm
                                                        fields={[
                                                            { key: 'text', label: 'Descripción', value: newExpenseText, set: setNewExpenseText },
                                                            { key: 'amount', label: 'Monto', value: newExpenseAmount, set: setNewExpenseAmount, type: 'number' },
                                                        ]}
                                                        onAdd={() => handleAddExpense(project.id)}
                                                        onCancel={resetForm}
                                                    />
                                                )}
                                            </Section>

                                            {/* Delete Project */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                                                <button
                                                    onClick={() => { removeNegocioProject(project.id); setExpandedProject(null); }}
                                                    style={{
                                                        background: 'rgba(249,65,68,0.08)', border: '1px solid rgba(249,65,68,0.15)',
                                                        borderRadius: '10px', padding: '8px 16px', cursor: 'pointer',
                                                        color: '#F94144', fontWeight: 700, fontSize: '0.75rem',
                                                        display: 'flex', alignItems: 'center', gap: '6px'
                                                    }}
                                                >
                                                    <Trash2 size={14} /> Eliminar proyecto
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* ── Add Project Button / Form ── */}
            {!addingProject ? (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setAddingProject(true)}
                    style={{
                        background: 'var(--bg-cream, #FDF8F5)',
                        border: '2px dashed #dac2b6',
                        borderRadius: '20px',
                        padding: '1.5rem',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        color: '#944a18', fontWeight: 700, fontSize: '0.9rem',
                        fontFamily: 'inherit'
                    }}
                >
                    <Plus size={20} /> Crear Proyecto de Negocio
                </motion.button>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: '#fff', borderRadius: '20px', padding: '1.5rem',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.06)'
                    }}
                >
                    <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 800, color: 'var(--text-carbon)' }}>Nuevo Proyecto</h3>
                    <input
                        placeholder="Nombre del proyecto (ej: Marketing Agency)"
                        value={newProjectName}
                        onChange={e => setNewProjectName(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e7e8e9',
                            fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: '0.75rem', boxSizing: 'border-box',
                            outline: 'none'
                        }}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleAddProject(); }}
                    />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setNewProjectColor(c)}
                                style={{
                                    width: '28px', height: '28px', borderRadius: '50%', border: newProjectColor === c ? `3px solid ${c}` : '2px solid #e7e8e9',
                                    background: c, cursor: 'pointer', transition: 'all 0.15s',
                                    transform: newProjectColor === c ? 'scale(1.2)' : 'scale(1)'
                                }}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleAddProject}
                            style={{
                                background: '#944a18', color: '#fff', border: 'none', borderRadius: '12px',
                                padding: '10px 20px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'inherit'
                            }}
                        >
                            Crear
                        </button>
                        <button
                            onClick={() => { setAddingProject(false); setNewProjectName(''); }}
                            style={{
                                background: 'transparent', color: '#888', border: '1px solid #e7e8e9', borderRadius: '12px',
                                padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit'
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </motion.div>
            )}

            {negocioProjects.length === 0 && !addingProject && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#aaa' }}>
                    <Briefcase size={48} strokeWidth={1.5} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <h3 style={{ margin: '0 0 0.5rem', color: '#888', fontWeight: 700 }}>Sin proyectos de negocio</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Crea un proyecto para simular ingresos, gastos y ganancias de tu agencia o negocio.</p>
                </div>
            )}
        </div>
    );
};

// ── Sub-components ──

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    color: string;
    count: number;
    onAdd: () => void;
    children: React.ReactNode;
}

const Section = ({ title, icon, color, count, onAdd, children }: SectionProps) => (
    <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {icon}
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
                <span style={{ fontSize: '0.7rem', background: `${color}15`, color, padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>{count}</span>
            </div>
            <button
                onClick={onAdd}
                style={{
                    background: `${color}12`, border: `1px solid ${color}25`, borderRadius: '8px',
                    padding: '4px 10px', cursor: 'pointer', color, fontSize: '0.7rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit'
                }}
            >
                <Plus size={12} /> Agregar
            </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {children}
        </div>
    </div>
);

interface ItemRowProps {
    label: string;
    sublabel?: string;
    amount: number;
    amountColor: string;
    onEdit: () => void;
    onRemove: () => void;
}

const ItemRow = ({ label, sublabel, amount, amountColor, onEdit, onRemove }: ItemRowProps) => (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderRadius: '10px', background: 'var(--bg-cream, #FDF8F5)',
        transition: 'background 0.15s'
    }}>
        <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-carbon)' }}>{label}</div>
            {sublabel && <div style={{ fontSize: '0.7rem', color: '#aaa' }}>{sublabel}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: amountColor }}>S/ {fmt(amount)}</span>
            <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: '2px', display: 'flex' }}>
                <Edit3 size={13} />
            </button>
            <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '2px', display: 'flex' }}>
                <Trash2 size={13} />
            </button>
        </div>
    </div>
);

interface AddFormProps {
    fields: { key: string; label: string; value: string; set: (v: string) => void; type?: string }[];
    onAdd: () => void;
    onCancel: () => void;
}

const AddForm = ({ fields, onAdd, onCancel }: AddFormProps) => (
    <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        style={{
            padding: '10px 12px', borderRadius: '12px', background: '#f8f9fa',
            border: '1px solid #e7e8e9'
        }}
    >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
            {fields.map(f => (
                <input
                    key={f.key}
                    placeholder={f.label}
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    type={f.type || 'text'}
                    style={{
                        padding: '8px 12px', borderRadius: '8px', border: '1px solid #e7e8e9',
                        fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box'
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') onAdd(); }}
                />
            ))}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={onAdd} style={{ background: '#944a18', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'inherit' }}>
                Agregar
            </button>
            <button onClick={onCancel} style={{ background: 'transparent', color: '#888', border: '1px solid #e7e8e9', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', fontFamily: 'inherit' }}>
                Cancelar
            </button>
        </div>
    </motion.div>
);

interface InlineEditProps {
    fields: { key: string; label: string; value: any; type?: string }[];
    editValue: any;
    setEditValue: (v: any) => void;
    onSave: () => void;
    onCancel: () => void;
}

const InlineEdit = ({ fields, editValue, setEditValue, onSave, onCancel }: InlineEditProps) => (
    <div style={{
        padding: '10px 12px', borderRadius: '12px', background: '#fff8f0',
        border: '1px solid #ffd8a8'
    }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
            {fields.map(f => (
                <input
                    key={f.key}
                    placeholder={f.label}
                    value={editValue[f.key] ?? ''}
                    onChange={e => setEditValue({ ...editValue, [f.key]: f.type === 'number' ? (e.target.value === '' ? '' : parseFloat(e.target.value) || 0) : e.target.value })}
                    type={f.type || 'text'}
                    style={{
                        padding: '8px 12px', borderRadius: '8px', border: '1px solid #e7e8e9',
                        fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box'
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
                    autoFocus
                />
            ))}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={onSave} style={{ background: '#06D6A0', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'inherit' }}>
                <Check size={13} /> Guardar
            </button>
            <button onClick={onCancel} style={{ background: 'transparent', color: '#888', border: '1px solid #e7e8e9', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.75rem', fontFamily: 'inherit' }}>
                <X size={13} /> Cancelar
            </button>
        </div>
    </div>
);
