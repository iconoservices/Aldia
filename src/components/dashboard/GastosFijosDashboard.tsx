import { useState, useMemo, useEffect } from "react";
import { Wallet, Plus, TrendingDown, Trash2, Edit2, Check, MoreVertical, X } from "lucide-react";
import { motion } from "framer-motion";
import type { Transaction, FixedExpense, Project, UserPreferences } from "../../hooks/useAlDiaState";
import { getPeriodKey } from "../../hooks/useAlDiaState";
import { C, bento, etiqueta } from "../../theme";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface Props {
    transactions: Transaction[];
    fixedExpenses: FixedExpense[];
    addFixedExpense: (text: string, amount: number, projectId?: number, dueDay?: number, accountId?: number, frequency?: 'monthly' | 'weekly', dueWeekday?: number) => void;
    removeFixedExpense: (id: number) => void;
    toggleFixedExpense: (id: number) => void;
    updateFixedExpense: (id: number, updates: Partial<FixedExpense>) => void;
    payFixedExpensePartial: (id: number, monthStr: string, amount: number, accountId?: number) => void;
    unmarkFixedExpensePaid: (id: number, monthStr: string) => void;
    rolloverFixedExpenses: () => void;
    payPendingPeriod: (id: number, period: string, amount: number, accountId?: number) => void;
    unmarkPendingPeriod: (id: number, period: string) => void;
    preferences: UserPreferences;
    updatePreference: (key: keyof UserPreferences, value: any) => void;
    projects: Project[];
    accounts: { id: number, name: string, color: string, projectIds?: number[] }[];
    addTransaction: (text: string, amount: number, type: "ingreso" | "gasto", isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean, category?: string, contact?: string) => void;
    removeTransaction: (id: number) => void;
}

const LABEL: React.CSSProperties = etiqueta;

export const GastosFijosDashboard = ({
    transactions, fixedExpenses, addFixedExpense, removeFixedExpense, toggleFixedExpense, updateFixedExpense,
    payFixedExpensePartial, unmarkFixedExpensePaid, rolloverFixedExpenses, payPendingPeriod, unmarkPendingPeriod,
    preferences, updatePreference, projects, accounts, addTransaction, removeTransaction,
}: Props) => {

    // Al entrar, revisa si algún gasto fijo cruzó de período (mes/semana)
    // sin quedar saldado, y lo deja como pendiente marcado con su propio período.
    useEffect(() => {
        rolloverFixedExpenses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const todayStr = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

    const totalFixedPending = useMemo(() =>
        fixedExpenses.filter(e => e.active).reduce((a, e) => {
            const period = getPeriodKey(e.frequency, todayStr);
            if (e.lastPaidMonth === period) return a;
            return a + (e.amount - (e.partialPaid?.month === period ? e.partialPaid.amount : 0));
        }, 0),
        [fixedExpenses, todayStr]);

    // Orden: primero los que tienen un abono parcial este período (les falta poco,
    // quiere verlos de un vistazo), luego los sin pagar, y al final los ya pagados.
    const sortedFixedExpenses = useMemo(() => {
        const statusRank = (e: FixedExpense) => {
            const period = getPeriodKey(e.frequency, todayStr);
            if (e.lastPaidMonth === period) return 2;
            if (e.partialPaid?.month === period && e.partialPaid.amount > 0) return 0;
            return 1;
        };
        return [...fixedExpenses].sort((a, b) => statusRank(a) - statusRank(b));
    }, [fixedExpenses, todayStr]);

    // ── Fixed incomes (stored in preferences as JSON) ─────────────────────
    type FixedIncomeItem = { id: number; name: string; amount: number; active: boolean; accountId?: number; frequency?: 'monthly' | 'weekly'; dueDay?: number; dueWeekday?: number; lastReceivedMonth?: string; partialReceived?: { month: string; amount: number } };
    const fixedIncomeItems: FixedIncomeItem[] = useMemo(() => {
        try { return JSON.parse(preferences.fixedIncomes || "[]"); } catch { return []; }
    }, [preferences.fixedIncomes]);
    const saveFixedIncomes = (items: FixedIncomeItem[]) =>
        updatePreference("fixedIncomes", JSON.stringify(items));
    const addFixedIncome = (name: string, amount: number, accountId?: number, frequency?: 'monthly' | 'weekly', dueDay?: number, dueWeekday?: number) =>
        saveFixedIncomes([...fixedIncomeItems, { id: Date.now(), name, amount, active: true, accountId, frequency, dueDay, dueWeekday }]);
    const removeFixedIncome = (id: number) =>
        saveFixedIncomes(fixedIncomeItems.filter(f => f.id !== id));
    const toggleFixedIncome = (id: number) =>
        saveFixedIncomes(fixedIncomeItems.map(f => f.id === id ? { ...f, active: !f.active } : f));
    const updateFixedIncome = (id: number, name: string, amount: number, accountId?: number, frequency?: 'monthly' | 'weekly', dueDay?: number, dueWeekday?: number) =>
        saveFixedIncomes(fixedIncomeItems.map(f => f.id === id ? { ...f, name, amount, accountId, frequency, dueDay, dueWeekday } : f));
    const markFixedIncomeReceived = (id: number, monthStr: string, accountId?: number) => {
        const item = fixedIncomeItems.find(f => f.id === id);
        if (!item) return;
        const resolvedAccountId = accountId ?? item.accountId;
        const alreadyReceived = item.partialReceived?.month === monthStr ? item.partialReceived.amount : 0;
        const remaining = Math.max(0, item.amount - alreadyReceived);
        saveFixedIncomes(fixedIncomeItems.map(f => f.id === id ? { ...f, lastReceivedMonth: monthStr, partialReceived: undefined } : f));
        if (item.lastReceivedMonth !== monthStr && remaining > 0) {
            addTransaction(`Depósito: ${item.name}`, remaining, 'ingreso', false, undefined, resolvedAccountId, false, 'Sueldo');
        }
    };
    // Recibe una parte del ingreso fijo. Si cubre el total pendiente, queda como recibido.
    const receiveFixedIncomePartial = (id: number, monthStr: string, amount: number, accountId?: number) => {
        const item = fixedIncomeItems.find(f => f.id === id);
        if (!item) return;
        const resolvedAccountId = accountId ?? item.accountId;
        const alreadyReceived = item.partialReceived?.month === monthStr ? item.partialReceived.amount : 0;
        const remaining = Math.max(0, item.amount - alreadyReceived);
        const value = Math.min(Math.abs(amount), remaining);
        if (value <= 0) return;
        const totalReceived = alreadyReceived + value;
        const isFullyReceived = totalReceived >= item.amount - 0.005;
        saveFixedIncomes(fixedIncomeItems.map(f => f.id === id ? {
            ...f,
            lastReceivedMonth: isFullyReceived ? monthStr : f.lastReceivedMonth,
            partialReceived: isFullyReceived ? undefined : { month: monthStr, amount: totalReceived },
        } : f));
        addTransaction(`Depósito: ${item.name}`, value, 'ingreso', false, undefined, resolvedAccountId, false, 'Sueldo');
    };
    const unmarkFixedIncomeReceived = (id: number, monthStr: string) => {
        const item = fixedIncomeItems.find(f => f.id === id);
        if (!item) return;
        saveFixedIncomes(fixedIncomeItems.map(f => f.id === id ? { ...f, lastReceivedMonth: undefined, partialReceived: undefined } : f));
        const targetTxPrefix = `Depósito: ${item.name}`;
        transactions.filter(t => t.text === targetTxPrefix && getPeriodKey(item.frequency, t.fullDate) === monthStr).forEach(t => removeTransaction(t.id));
    };

    const totalIncomePending = useMemo(() =>
        fixedIncomeItems.filter(f => f.active).reduce((s, f) => {
            const period = getPeriodKey(f.frequency, todayStr);
            if (f.lastReceivedMonth === period) return s;
            return s + (f.amount - (f.partialReceived?.month === period ? f.partialReceived.amount : 0));
        }, 0),
        [fixedIncomeItems, todayStr]);

    const [showAllFixedIncomes, setShowAllFixedIncomes] = useState(false);
    const [showAllFixedExpenses, setShowAllFixedExpenses] = useState(false);
    const LISTA_VISIBLE = 6;

    return (
        <div style={{ paddingBottom: '5rem', display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>

            {/* Fixed incomes card */}
            <div style={{ ...bento, padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.6rem", minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={LABEL}>Ingresos Fijos</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.secondary }}>Pendiente: S/ {totalIncomePending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        <Wallet size={14} color={C.secondary} />
                    </div>
                </div>

                {/* List of fixed incomes */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {fixedIncomeItems.length === 0 && (
                        <p style={{ fontSize: "0.75rem", color: C.outline, margin: 0 }}>Sin ingresos fijos. Agrega uno abajo.</p>
                    )}
                    {(showAllFixedIncomes ? fixedIncomeItems : fixedIncomeItems.slice(0, LISTA_VISIBLE)).map(item => (
                        <FixedIncomeRow key={item.id} item={item} toggleFixedIncome={toggleFixedIncome} removeFixedIncome={removeFixedIncome} updateFixedIncome={updateFixedIncome} markFixedIncomeReceived={markFixedIncomeReceived} receiveFixedIncomePartial={receiveFixedIncomePartial} unmarkFixedIncomeReceived={unmarkFixedIncomeReceived} isReceived={item.lastReceivedMonth === getPeriodKey(item.frequency, todayStr)} accounts={accounts} />
                    ))}
                    {fixedIncomeItems.length > LISTA_VISIBLE && (
                        <button onClick={() => setShowAllFixedIncomes(v => !v)} style={{ background: "none", border: "none", padding: "2px 0", cursor: "pointer", color: C.secondary, fontSize: "0.72rem", fontWeight: 700, textAlign: "left" }}>
                            {showAllFixedIncomes ? "Ver menos" : `Ver todos (${fixedIncomeItems.length})`}
                        </button>
                    )}
                </div>

                {/* Add new income */}
                <div style={{ marginTop: "0.2rem" }}>
                    <NewFixedIncomeForm addFixedIncome={addFixedIncome} accounts={accounts} />
                </div>
            </div>

            {/* Fixed expenses card */}
            <div style={{ ...bento, padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.6rem", minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={LABEL}>Gastos Fijos</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.rojo }}>Pendiente: S/ {totalFixedPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        <TrendingDown size={14} color={C.rojo} />
                    </div>
                </div>

                {/* List of fixed expenses */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {fixedExpenses.length === 0 && (
                        <p style={{ fontSize: "0.75rem", color: C.outline, margin: 0 }}>Sin gastos fijos. Agrega uno abajo.</p>
                    )}
                    {(showAllFixedExpenses ? sortedFixedExpenses : sortedFixedExpenses.slice(0, LISTA_VISIBLE)).map(exp => (
                        <FixedExpenseRow key={exp.id} expense={exp} toggleFixedExpense={toggleFixedExpense} removeFixedExpense={removeFixedExpense} updateFixedExpense={updateFixedExpense} payFixedExpensePartial={payFixedExpensePartial} unmarkFixedExpensePaid={unmarkFixedExpensePaid} payPendingPeriod={payPendingPeriod} unmarkPendingPeriod={unmarkPendingPeriod} isPaid={exp.lastPaidMonth === getPeriodKey(exp.frequency, todayStr)} projects={projects} accounts={accounts} />
                    ))}
                    {fixedExpenses.length > LISTA_VISIBLE && (
                        <button onClick={() => setShowAllFixedExpenses(v => !v)} style={{ background: "none", border: "none", padding: "2px 0", cursor: "pointer", color: C.rojo, fontSize: "0.72rem", fontWeight: 700, textAlign: "left" }}>
                            {showAllFixedExpenses ? "Ver menos" : `Ver todos (${fixedExpenses.length})`}
                        </button>
                    )}
                </div>

                {/* Add new expense */}
                <div style={{ marginTop: "0.2rem" }}>
                    <NewFixedExpenseForm addFixedExpense={addFixedExpense} projects={projects} accounts={accounts} />
                </div>
            </div>

        </div>
    );
};

// ─── Shared micro-components ──────────────────────────────────────────────────
const FEChip = ({ children, color, bg }: { children: React.ReactNode, color: string, bg: string }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.62rem", fontWeight: 700, color, background: bg, padding: "2px 7px", borderRadius: "999px", lineHeight: 1.4 }}>
        {children}
    </span>
);

const feInputStyle: React.CSSProperties = { padding: "7px 9px", borderRadius: "9px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.8rem", outline: "none", background: "white", boxSizing: "border-box", width: "100%" };
const feLabelStyle: React.CSSProperties = { fontSize: "0.62rem", fontWeight: 800, color: C.outline, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "3px", display: "block" };
const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
// dueDay === 0 es un valor especial: "último día del mes" (cubre feb/abr/jun... sin fijar 31 a mano)
const dueDayLabel = (dueDay?: number) => dueDay === 0 ? "último día del mes" : (dueDay ? `día ${dueDay}` : "");
const FrequencyToggle = ({ frequency, setFrequency }: { frequency: 'monthly' | 'weekly'; setFrequency: (f: 'monthly' | 'weekly') => void }) => (
    <div style={{ display: "flex", gap: "6px" }}>
        {([["monthly", "Mensual"], ["weekly", "Semanal"]] as const).map(([val, label]) => (
            <button key={val} type="button" onClick={() => setFrequency(val)} style={{ flex: 1, padding: "6px", borderRadius: "8px", border: `1px solid ${frequency === val ? C.secondary : C.outlineVariant}`, background: frequency === val ? C.secondary : "white", color: frequency === val ? "white" : C.onSurfaceVariant, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>{label}</button>
        ))}
    </div>
);

// ─── Fixed expense row ────────────────────────────────────────────────────────
function pendingPeriodLabel(period: string): string {
    const monthMatch = /^(\d{4})-(\d{2})$/.exec(period);
    if (monthMatch) {
        const [, y, m] = monthMatch;
        const nombre = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-ES", { month: "long" });
        return nombre.charAt(0).toUpperCase() + nombre.slice(1);
    }
    const weekMatch = /^(\d{4})-W(\d{2})$/.exec(period);
    if (weekMatch) return `Semana ${weekMatch[2]} · ${weekMatch[1]}`;
    return period;
}

const FixedExpenseRow = ({ expense, toggleFixedExpense, removeFixedExpense, updateFixedExpense, payFixedExpensePartial, unmarkFixedExpensePaid, payPendingPeriod, unmarkPendingPeriod, isPaid, accounts, projects }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(expense.text);
    const [editAmount, setEditAmount] = useState(String(expense.amount));
    const [editAccountId, setEditAccountId] = useState<number | undefined>(expense.accountId);
    const [editProjectId, setEditProjectId] = useState<number | undefined>(expense.projectId);
    const [editDueDay, setEditDueDay] = useState<number | undefined>(expense.dueDay);
    const [editFrequency, setEditFrequency] = useState<'monthly' | 'weekly'>(expense.frequency ?? 'monthly');
    const [editDueWeekday, setEditDueWeekday] = useState<number>(expense.dueWeekday ?? 1);
    const [isPaying, setIsPaying] = useState(false);
    const [payAmount, setPayAmount] = useState("");
    const [payAccountId, setPayAccountId] = useState<number | undefined>(expense.accountId);
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const todayStr = new Date().toLocaleDateString("en-CA");
    const monthStr = getPeriodKey(expense.frequency, todayStr);
    const account = accounts?.find((a: any) => a.id === expense.accountId);
    const project = projects?.find((p: any) => p.id === expense.projectId);

    const paidSoFar = isPaid ? expense.amount : (expense.partialPaid?.month === monthStr ? expense.partialPaid.amount : 0);
    const pending = Math.max(0, expense.amount - paidSoFar);
    const hasPartial = !isPaid && paidSoFar > 0;

    const openPay = () => { setPayAmount(pending.toFixed(2)); setPayAccountId(expense.accountId); setIsPaying(true); };
    const confirmPay = () => {
        const value = parseFloat(payAmount);
        if (!value || value <= 0 || !payAccountId) return;
        payFixedExpensePartial(expense.id, monthStr, value, payAccountId);
        setIsPaying(false);
    };

    if (isEditing) return (
        <div style={{ display: "flex", flexDirection: "column", gap: "9px", padding: "10px 2px 14px", borderBottom: `1px solid ${C.surfaceContainerLow}` }}>
            <div>
                <label style={feLabelStyle}>Nombre</label>
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} style={feInputStyle} />
            </div>
            <div>
                <label style={feLabelStyle}>Frecuencia</label>
                <FrequencyToggle frequency={editFrequency} setFrequency={setEditFrequency} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
                <div>
                    <label style={feLabelStyle}>Monto</label>
                    <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={feInputStyle} />
                </div>
                {editFrequency === 'weekly' ? (
                    <div>
                        <label style={feLabelStyle}>Día de la semana</label>
                        <select value={editDueWeekday} onChange={e => setEditDueWeekday(Number(e.target.value))} style={{ ...feInputStyle, fontWeight: 700, cursor: "pointer" }}>
                            {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
                        </select>
                    </div>
                ) : (
                    <div>
                        <label style={feLabelStyle}>Día de cobro</label>
                        <input type="number" min="1" max="31" placeholder="—" disabled={editDueDay === 0} value={editDueDay === 0 ? "" : editDueDay ?? ""} onChange={e => setEditDueDay(e.target.value ? Number(e.target.value) : undefined)} style={feInputStyle} />
                        <label style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px", fontSize: "0.7rem", color: C.onSurfaceVariant, cursor: "pointer" }}>
                            <input type="checkbox" checked={editDueDay === 0} onChange={e => setEditDueDay(e.target.checked ? 0 : undefined)} />
                            Último día del mes
                        </label>
                    </div>
                )}
            </div>
            <div>
                <label style={feLabelStyle}>¿Desde qué cuenta?</label>
                <select value={editAccountId ?? ""} onChange={e => setEditAccountId(e.target.value ? Number(e.target.value) : undefined)} style={{ ...feInputStyle, fontWeight: 700, cursor: "pointer" }}>
                    <option value="">Sin cuenta asignada</option>
                    {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>
            {projects?.length > 0 && (
                <div>
                    <label style={feLabelStyle}>Proyecto</label>
                    <select value={editProjectId ?? ""} onChange={e => setEditProjectId(e.target.value ? Number(e.target.value) : undefined)} style={{ ...feInputStyle, fontWeight: 700, cursor: "pointer" }}>
                        <option value="">Sin proyecto</option>
                        {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "2px" }}>
                <button onClick={() => setIsEditing(false)} style={{ background: "none", border: `1px solid ${C.outlineVariant}`, color: C.onSurfaceVariant, borderRadius: "9px", padding: "7px 14px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Cancelar</button>
                <button onClick={() => { updateFixedExpense(expense.id, { text: editName, amount: Number(editAmount), accountId: editAccountId, projectId: editProjectId, frequency: editFrequency, dueDay: editFrequency === 'monthly' ? editDueDay : undefined, dueWeekday: editFrequency === 'weekly' ? editDueWeekday : undefined }); setIsEditing(false); }} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "9px", padding: "7px 14px", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>Guardar</button>
            </div>
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "7px", padding: "10px 2px", borderBottom: `1px solid ${C.surfaceContainerLow}`, opacity: expense.active ? 1 : 0.5 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "9px" }}>
                <div onClick={() => toggleFixedExpense(expense.id)} title={expense.active ? "Desactivar" : "Activar"} style={{ width: "28px", height: "16px", borderRadius: "9px", background: expense.active ? C.secondary : C.outlineVariant, position: "relative", cursor: "pointer", flexShrink: 0, marginTop: "2px", transition: "background 0.2s" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", left: expense.active ? "14px" : "2px", transition: "left 0.15s" }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: isPaid ? C.outline : C.onSurface, textDecoration: isPaid ? "line-through" : "none" }}>
                        {expense.text}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                        {expense.frequency === 'weekly'
                            ? <FEChip color={C.onSurfaceVariant} bg={C.surfaceContainer}>cada {WEEKDAYS[expense.dueWeekday ?? 1]}</FEChip>
                            : (expense.dueDay !== undefined && <FEChip color={C.onSurfaceVariant} bg={C.surfaceContainer}>{dueDayLabel(expense.dueDay)}</FEChip>)}
                        {account ? (
                            <FEChip color={C.secondary} bg="rgba(72,88,171,0.1)">{account.name}</FEChip>
                        ) : (
                            <FEChip color={C.rojo} bg="rgba(239,68,68,0.1)">sin cuenta</FEChip>
                        )}
                        {project && <FEChip color={C.primary} bg="rgba(148,74,24,0.1)">{project.name}</FEChip>}
                    </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0, position: "relative" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem", color: isPaid ? C.verde : C.onSurface }}>
                        S/ {expense.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <button onClick={() => setMenuOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "3px", display: "flex", marginLeft: "auto", marginTop: "2px" }}><MoreVertical size={14} /></button>

                    {menuOpen && (
                        <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 5, background: "white", border: `1px solid ${C.outlineVariant}`, borderRadius: "9px", boxShadow: "0 4px 14px rgba(0,0,0,0.1)", overflow: "hidden", minWidth: "120px" }}>
                            <button onClick={() => { setIsEditing(true); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.onSurface, fontSize: "0.78rem", fontWeight: 600, textAlign: "left" }}><Edit2 size={13} /> Editar</button>
                            <button onClick={() => { setConfirmDelete(true); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.rojo, fontSize: "0.78rem", fontWeight: 600, textAlign: "left", borderTop: `1px solid ${C.surfaceContainerLow}` }}><Trash2 size={13} /> Eliminar</button>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={confirmDelete}
                title="Eliminar gasto fijo"
                message={`¿Eliminar "${expense.text}"? Esto no borra los pagos ya registrados, solo deja de aparecer como gasto fijo.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { removeFixedExpense(expense.id); setConfirmDelete(false); }}
                onCancel={() => setConfirmDelete(false)}
            />

            {hasPartial && (
                <div>
                    <div style={{ height: "5px", borderRadius: "999px", background: C.surfaceContainer, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, (paidSoFar / expense.amount) * 100)}%`, background: C.ambar, borderRadius: "999px" }} />
                    </div>
                    <div style={{ fontSize: "0.65rem", color: C.outline, marginTop: "3px", fontWeight: 600 }}>
                        Abonado S/ {paidSoFar.toLocaleString("en-US", { minimumFractionDigits: 2 })} de S/ {expense.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} · falta S/ {pending.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                </div>
            )}

            {expense.pendingPeriods && expense.pendingPeriods.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {expense.pendingPeriods.map((p: { period: string; amountPaid: number }) => (
                        <PendingPeriodRow
                            key={p.period}
                            expense={expense}
                            entry={p}
                            payPendingPeriod={payPendingPeriod}
                            unmarkPendingPeriod={unmarkPendingPeriod}
                            accounts={accounts}
                        />
                    ))}
                </div>
            )}

            {isPaying ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: C.surfaceContainerLow, padding: "6px", borderRadius: "9px" }}>
                    {!expense.accountId && (
                        <select autoFocus value={payAccountId ?? ""} onChange={e => setPayAccountId(e.target.value ? Number(e.target.value) : undefined)} style={{ padding: "6px", borderRadius: "7px", border: `1px solid ${!payAccountId ? C.rojo : C.outlineVariant}`, fontSize: "0.75rem", fontWeight: 700, outline: "none", background: "white", cursor: "pointer" }}>
                            <option value="">¿De qué cuenta sale?</option>
                            {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    )}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <div style={{ position: "relative", flex: 1 }}>
                            <span style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "0.72rem", fontWeight: 700, color: C.onSurfaceVariant }}>S/</span>
                            <input autoFocus={!!expense.accountId} type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && confirmPay()} style={{ width: "100%", padding: "6px 6px 6px 26px", borderRadius: "7px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.8rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <button onClick={() => setPayAmount(pending.toFixed(2))} style={{ padding: "6px 8px", borderRadius: "7px", border: "none", background: C.surfaceContainerHigh, color: C.onSurfaceVariant, fontSize: "0.65rem", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>Todo</button>
                        <button onClick={confirmPay} disabled={!payAccountId} title={!payAccountId ? "Elige primero de qué cuenta sale" : undefined} style={{ padding: "6px 10px", borderRadius: "7px", border: "none", background: payAccountId ? C.verde : C.outlineVariant, color: "white", fontSize: "0.7rem", fontWeight: 800, cursor: payAccountId ? "pointer" : "not-allowed" }}>Pagar</button>
                        <button onClick={() => setIsPaying(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "4px", display: "flex" }}><X size={14} /></button>
                    </div>
                </div>
            ) : isPaid ? (
                <button onClick={() => unmarkFixedExpensePaid(expense.id, monthStr)} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", padding: 0, cursor: "pointer", color: C.outline, fontSize: "0.7rem", fontWeight: 700 }}>
                    <Check size={13} color={C.verde} /> Pagado · deshacer
                </button>
            ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button onClick={openPay} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", flex: 1, background: C.surfaceContainerLow, border: "none", borderRadius: "8px", padding: "7px", cursor: "pointer", color: C.onSurfaceVariant, fontSize: "0.75rem", fontWeight: 700 }}>
                        <Check size={13} /> {hasPartial ? `Abonar resto · S/ ${pending.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Marcar pagado"}
                    </button>
                    {hasPartial && (
                        <button onClick={() => unmarkFixedExpensePaid(expense.id, monthStr)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.outline, fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                            Deshacer abono
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// Fila de un período anterior que quedó sin saldar: se muestra aparte, marcada con
// su propio mes, sin sumarse al monto del período en curso.
const PendingPeriodRow = ({ expense, entry, payPendingPeriod, unmarkPendingPeriod, accounts }: any) => {
    const [isPaying, setIsPaying] = useState(false);
    const pending = Math.max(0, expense.amount - entry.amountPaid);
    const [payAmount, setPayAmount] = useState(pending.toFixed(2));
    const [payAccountId, setPayAccountId] = useState<number | undefined>(expense.accountId);

    const openPay = () => { setPayAmount(pending.toFixed(2)); setPayAccountId(expense.accountId); setIsPaying(true); };
    const confirmPay = () => {
        const value = parseFloat(payAmount);
        if (!value || value <= 0 || !payAccountId) return;
        payPendingPeriod(expense.id, entry.period, value, payAccountId);
        setIsPaying(false);
    };

    return (
        <div style={{ background: "rgba(239,68,68,0.06)", border: `1px solid rgba(239,68,68,0.18)`, borderRadius: "9px", padding: "7px 9px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.rojo }}>
                    {pendingPeriodLabel(entry.period)} · falta S/ {pending.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    {entry.amountPaid > 0 && <span style={{ color: C.outline, fontWeight: 600 }}> (abonado S/ {entry.amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })})</span>}
                </div>
                {!isPaying && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        <button onClick={openPay} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.secondary, fontSize: "0.72rem", fontWeight: 800 }}>Pagar</button>
                        {entry.amountPaid > 0 && (
                            <button onClick={() => unmarkPendingPeriod(expense.id, entry.period)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.outline, fontSize: "0.68rem", fontWeight: 700 }}>Deshacer</button>
                        )}
                    </div>
                )}
            </div>
            {isPaying && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {!expense.accountId && (
                        <select autoFocus value={payAccountId ?? ""} onChange={e => setPayAccountId(e.target.value ? Number(e.target.value) : undefined)} style={{ padding: "6px", borderRadius: "7px", border: `1px solid ${!payAccountId ? C.rojo : C.outlineVariant}`, fontSize: "0.75rem", fontWeight: 700, outline: "none", background: "white", cursor: "pointer" }}>
                            <option value="">¿De qué cuenta sale?</option>
                            {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    )}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <div style={{ position: "relative", flex: 1 }}>
                            <span style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "0.72rem", fontWeight: 700, color: C.onSurfaceVariant }}>S/</span>
                            <input autoFocus={!!expense.accountId} type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && confirmPay()} style={{ width: "100%", padding: "6px 6px 6px 26px", borderRadius: "7px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.8rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <button onClick={() => setPayAmount(pending.toFixed(2))} style={{ padding: "6px 8px", borderRadius: "7px", border: "none", background: C.surfaceContainerHigh, color: C.onSurfaceVariant, fontSize: "0.65rem", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>Todo</button>
                        <button onClick={confirmPay} disabled={!payAccountId} title={!payAccountId ? "Elige primero de qué cuenta sale" : undefined} style={{ padding: "6px 10px", borderRadius: "7px", border: "none", background: payAccountId ? C.verde : C.outlineVariant, color: "white", fontSize: "0.7rem", fontWeight: 800, cursor: payAccountId ? "pointer" : "not-allowed" }}>Pagar</button>
                        <button onClick={() => setIsPaying(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "4px", display: "flex" }}><X size={14} /></button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── New fixed expense form ───────────────────────────────────────────────────
const NewFixedExpenseForm = ({ addFixedExpense, projects, accounts }: any) => {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [frequency, setFrequency] = useState<'monthly' | 'weekly'>('monthly');
    const [dueDay, setDueDay] = useState<number | undefined>(undefined);
    const [dueWeekday, setDueWeekday] = useState<number>(1);
    const [projectId, setProjectId] = useState<number | undefined>(undefined);
    const [accountId, setAccountId] = useState<number | undefined>(undefined);
    const [open, setOpen] = useState(false);

    const submit = () => {
        if (name && amount) {
            addFixedExpense(name, parseFloat(amount), projectId, frequency === 'monthly' ? dueDay : undefined, accountId, frequency, frequency === 'weekly' ? dueWeekday : undefined);
            setName(""); setAmount(""); setProjectId(undefined); setDueDay(undefined); setDueWeekday(1); setFrequency('monthly'); setAccountId(undefined); setOpen(false);
        }
    };

    if (!open) return (
        <button onClick={() => setOpen(true)} style={{ display: "flex", alignItems: "center", gap: "7px", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
            <Plus size={13} color={C.outline} /><span style={{ fontSize: "0.78rem", fontWeight: 600, color: C.outline }}>Nuevo gasto fijo...</span>
        </button>
    );

    return (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: "9px", background: C.surface, padding: "12px", borderRadius: "12px", border: `1px solid ${C.outlineVariant}` }}>
            <div>
                <label style={feLabelStyle}>Nombre</label>
                <input autoFocus placeholder="Ej. Netflix" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={feInputStyle} />
            </div>
            <div>
                <label style={feLabelStyle}>Frecuencia</label>
                <FrequencyToggle frequency={frequency} setFrequency={setFrequency} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
                <div>
                    <label style={feLabelStyle}>Monto</label>
                    <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={feInputStyle} />
                </div>
                {frequency === 'weekly' ? (
                    <div>
                        <label style={feLabelStyle}>Día de la semana</label>
                        <select value={dueWeekday} onChange={e => setDueWeekday(Number(e.target.value))} style={{ ...feInputStyle, fontWeight: 700, cursor: "pointer" }}>
                            {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
                        </select>
                    </div>
                ) : (
                    <div>
                        <label style={feLabelStyle}>Día de cobro</label>
                        <input type="number" placeholder="—" disabled={dueDay === 0} value={dueDay === 0 ? "" : dueDay || ""} onChange={e => setDueDay(e.target.value ? Number(e.target.value) : undefined)} min="1" max="31" style={feInputStyle} />
                        <label style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px", fontSize: "0.7rem", color: C.onSurfaceVariant, cursor: "pointer" }}>
                            <input type="checkbox" checked={dueDay === 0} onChange={e => setDueDay(e.target.checked ? 0 : undefined)} />
                            Último día del mes
                        </label>
                    </div>
                )}
            </div>
            {accounts?.length > 0 && (
                <div>
                    <label style={feLabelStyle}>¿Desde qué cuenta?</label>
                    <select value={accountId || ""} onChange={e => setAccountId(e.target.value ? Number(e.target.value) : undefined)} style={{ ...feInputStyle, fontWeight: 700, cursor: "pointer" }}>
                        <option value="">Sin cuenta asignada</option>
                        {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
            )}
            {projects.length > 0 && (
                <div>
                    <label style={feLabelStyle}>Proyecto</label>
                    <select value={projectId || ""} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : undefined)} style={{ ...feInputStyle, fontWeight: 700, cursor: "pointer" }}>
                        <option value="">Sin proyecto</option>
                        {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "2px" }}>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: `1px solid ${C.outlineVariant}`, color: C.onSurfaceVariant, borderRadius: "9px", padding: "7px 14px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Cancelar</button>
                <button onClick={submit} style={{ padding: "7px 14px", borderRadius: "9px", border: "none", background: C.secondary, color: "white", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer" }}>Agregar</button>
            </div>
        </motion.div>
    );
};

// ─── Fixed income row ─────────────────────────────────────────────────────────
const FixedIncomeRow = ({ item, toggleFixedIncome, removeFixedIncome, updateFixedIncome, receiveFixedIncomePartial, unmarkFixedIncomeReceived, isReceived, accounts }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(item.name);
    const [editAmount, setEditAmount] = useState(String(item.amount));
    const [editAccountId, setEditAccountId] = useState<number | undefined>(item.accountId);
    const [editFrequency, setEditFrequency] = useState<'monthly' | 'weekly'>(item.frequency ?? 'monthly');
    const [editDueDay, setEditDueDay] = useState<number | undefined>(item.dueDay);
    const [editDueWeekday, setEditDueWeekday] = useState<number>(item.dueWeekday ?? 1);
    const [isReceiving, setIsReceiving] = useState(false);
    const [receiveAmount, setReceiveAmount] = useState("");
    const [receiveAccountId, setReceiveAccountId] = useState<number | undefined>(item.accountId);
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const todayStr = new Date().toLocaleDateString("en-CA");
    const monthStr = getPeriodKey(item.frequency, todayStr);
    const account = accounts?.find((a: any) => a.id === item.accountId);

    const receivedSoFar = isReceived ? item.amount : (item.partialReceived?.month === monthStr ? item.partialReceived.amount : 0);
    const pending = Math.max(0, item.amount - receivedSoFar);
    const hasPartial = !isReceived && receivedSoFar > 0;

    const openReceive = () => { setReceiveAmount(pending.toFixed(2)); setReceiveAccountId(item.accountId); setIsReceiving(true); };
    const confirmReceive = () => {
        const value = parseFloat(receiveAmount);
        if (!value || value <= 0 || !receiveAccountId) return;
        receiveFixedIncomePartial(item.id, monthStr, value, receiveAccountId);
        setIsReceiving(false);
    };

    if (isEditing) return (
        <div style={{ display: "flex", flexDirection: "column", gap: "9px", padding: "10px 2px 14px", borderBottom: `1px solid ${C.surfaceContainerLow}` }}>
            <div>
                <label style={feLabelStyle}>Nombre</label>
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} style={feInputStyle} />
            </div>
            <div>
                <label style={feLabelStyle}>Frecuencia</label>
                <FrequencyToggle frequency={editFrequency} setFrequency={setEditFrequency} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
                <div>
                    <label style={feLabelStyle}>Monto</label>
                    <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={feInputStyle} />
                </div>
                {editFrequency === 'weekly' ? (
                    <div>
                        <label style={feLabelStyle}>Día de la semana</label>
                        <select value={editDueWeekday} onChange={e => setEditDueWeekday(Number(e.target.value))} style={{ ...feInputStyle, fontWeight: 700, cursor: "pointer" }}>
                            {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
                        </select>
                    </div>
                ) : (
                    <div>
                        <label style={feLabelStyle}>Día de cobro</label>
                        <input type="number" min="1" max="31" placeholder="—" disabled={editDueDay === 0} value={editDueDay === 0 ? "" : editDueDay ?? ""} onChange={e => setEditDueDay(e.target.value ? Number(e.target.value) : undefined)} style={feInputStyle} />
                        <label style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px", fontSize: "0.7rem", color: C.onSurfaceVariant, cursor: "pointer" }}>
                            <input type="checkbox" checked={editDueDay === 0} onChange={e => setEditDueDay(e.target.checked ? 0 : undefined)} />
                            Último día del mes
                        </label>
                    </div>
                )}
            </div>
            <div>
                <label style={feLabelStyle}>¿A qué cuenta llega?</label>
                <select value={editAccountId ?? ""} onChange={e => setEditAccountId(e.target.value ? Number(e.target.value) : undefined)} style={{ ...feInputStyle, fontWeight: 700, cursor: "pointer" }}>
                    <option value="">Sin cuenta asignada</option>
                    {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "2px" }}>
                <button onClick={() => setIsEditing(false)} style={{ background: "none", border: `1px solid ${C.outlineVariant}`, color: C.onSurfaceVariant, borderRadius: "9px", padding: "7px 14px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Cancelar</button>
                <button onClick={() => { updateFixedIncome(item.id, editName, Number(editAmount), editAccountId, editFrequency, editFrequency === 'monthly' ? editDueDay : undefined, editFrequency === 'weekly' ? editDueWeekday : undefined); setIsEditing(false); }} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "9px", padding: "7px 14px", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>Guardar</button>
            </div>
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "7px", padding: "10px 2px", borderBottom: `1px solid ${C.surfaceContainerLow}`, opacity: item.active ? 1 : 0.5 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "9px" }}>
                <div onClick={() => toggleFixedIncome(item.id)} title={item.active ? "Desactivar" : "Activar"} style={{ width: "28px", height: "16px", borderRadius: "9px", background: item.active ? C.secondary : C.outlineVariant, position: "relative", cursor: "pointer", flexShrink: 0, marginTop: "2px", transition: "background 0.2s" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", left: item.active ? "14px" : "2px", transition: "left 0.15s" }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: isReceived ? C.outline : C.onSurface, textDecoration: isReceived ? "line-through" : "none" }}>
                        {item.name}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                        {item.frequency === 'weekly'
                            ? <FEChip color={C.onSurfaceVariant} bg={C.surfaceContainer}>cada {WEEKDAYS[item.dueWeekday ?? 1]}</FEChip>
                            : (item.dueDay !== undefined && <FEChip color={C.onSurfaceVariant} bg={C.surfaceContainer}>{dueDayLabel(item.dueDay)}</FEChip>)}
                        {account ? (
                            <FEChip color={C.secondary} bg="rgba(72,88,171,0.1)">{account.name}</FEChip>
                        ) : (
                            <FEChip color={C.rojo} bg="rgba(239,68,68,0.1)">sin cuenta</FEChip>
                        )}
                    </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0, position: "relative" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem", color: isReceived ? C.verde : C.onSurface }}>
                        S/ {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <button onClick={() => setMenuOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "3px", display: "flex", marginLeft: "auto", marginTop: "2px" }}><MoreVertical size={14} /></button>

                    {menuOpen && (
                        <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 5, background: "white", border: `1px solid ${C.outlineVariant}`, borderRadius: "9px", boxShadow: "0 4px 14px rgba(0,0,0,0.1)", overflow: "hidden", minWidth: "120px" }}>
                            <button onClick={() => { setIsEditing(true); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.onSurface, fontSize: "0.78rem", fontWeight: 600, textAlign: "left" }}><Edit2 size={13} /> Editar</button>
                            <button onClick={() => { setConfirmDelete(true); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.rojo, fontSize: "0.78rem", fontWeight: 600, textAlign: "left", borderTop: `1px solid ${C.surfaceContainerLow}` }}><Trash2 size={13} /> Eliminar</button>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={confirmDelete}
                title="Eliminar ingreso fijo"
                message={`¿Eliminar "${item.name}"? Esto no borra los depósitos ya registrados, solo deja de aparecer como ingreso fijo.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { removeFixedIncome(item.id); setConfirmDelete(false); }}
                onCancel={() => setConfirmDelete(false)}
            />

            {hasPartial && (
                <div>
                    <div style={{ height: "5px", borderRadius: "999px", background: C.surfaceContainer, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, (receivedSoFar / item.amount) * 100)}%`, background: C.secondary, borderRadius: "999px" }} />
                    </div>
                    <div style={{ fontSize: "0.65rem", color: C.outline, marginTop: "3px", fontWeight: 600 }}>
                        Recibido S/ {receivedSoFar.toLocaleString("en-US", { minimumFractionDigits: 2 })} de S/ {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })} · falta S/ {pending.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                </div>
            )}

            {isReceiving ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: C.surfaceContainerLow, padding: "6px", borderRadius: "9px" }}>
                    {!item.accountId && (
                        <select autoFocus value={receiveAccountId ?? ""} onChange={e => setReceiveAccountId(e.target.value ? Number(e.target.value) : undefined)} style={{ padding: "6px", borderRadius: "7px", border: `1px solid ${!receiveAccountId ? C.rojo : C.outlineVariant}`, fontSize: "0.75rem", fontWeight: 700, outline: "none", background: "white", cursor: "pointer" }}>
                            <option value="">¿A qué cuenta entra?</option>
                            {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    )}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <div style={{ position: "relative", flex: 1 }}>
                            <span style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "0.72rem", fontWeight: 700, color: C.onSurfaceVariant }}>S/</span>
                            <input autoFocus={!!item.accountId} type="number" value={receiveAmount} onChange={e => setReceiveAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && confirmReceive()} style={{ width: "100%", padding: "6px 6px 6px 26px", borderRadius: "7px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.8rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <button onClick={() => setReceiveAmount(pending.toFixed(2))} style={{ padding: "6px 8px", borderRadius: "7px", border: "none", background: C.surfaceContainerHigh, color: C.onSurfaceVariant, fontSize: "0.65rem", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>Todo</button>
                        <button onClick={confirmReceive} disabled={!receiveAccountId} title={!receiveAccountId ? "Elige primero a qué cuenta entra" : undefined} style={{ padding: "6px 10px", borderRadius: "7px", border: "none", background: receiveAccountId ? C.verde : C.outlineVariant, color: "white", fontSize: "0.7rem", fontWeight: 800, cursor: receiveAccountId ? "pointer" : "not-allowed" }}>Recibir</button>
                        <button onClick={() => setIsReceiving(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "4px", display: "flex" }}><X size={14} /></button>
                    </div>
                </div>
            ) : isReceived ? (
                <button onClick={() => unmarkFixedIncomeReceived(item.id, monthStr)} style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", padding: 0, cursor: "pointer", color: C.outline, fontSize: "0.7rem", fontWeight: 700 }}>
                    <Check size={13} color={C.verde} /> Recibido · deshacer
                </button>
            ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button onClick={openReceive} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", flex: 1, background: C.surfaceContainerLow, border: "none", borderRadius: "8px", padding: "7px", cursor: "pointer", color: C.onSurfaceVariant, fontSize: "0.75rem", fontWeight: 700 }}>
                        <Check size={13} /> {hasPartial ? `Recibir resto · S/ ${pending.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Marcar recibido"}
                    </button>
                    {hasPartial && (
                        <button onClick={() => unmarkFixedIncomeReceived(item.id, monthStr)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.outline, fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                            Deshacer abono
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── New fixed income form ─────────────────────────────────────────────────────
const NewFixedIncomeForm = ({ addFixedIncome, accounts }: any) => {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [frequency, setFrequency] = useState<'monthly' | 'weekly'>('monthly');
    const [dueDay, setDueDay] = useState<number | undefined>(undefined);
    const [dueWeekday, setDueWeekday] = useState<number>(1);
    const [accountId, setAccountId] = useState<number | undefined>(undefined);
    const [open, setOpen] = useState(false);

    const submit = () => {
        if (name && amount) {
            addFixedIncome(name, parseFloat(amount), accountId, frequency, frequency === 'monthly' ? dueDay : undefined, frequency === 'weekly' ? dueWeekday : undefined);
            setName(""); setAmount(""); setAccountId(undefined); setFrequency('monthly'); setDueDay(undefined); setDueWeekday(1); setOpen(false);
        }
    };

    if (!open) return (
        <button onClick={() => setOpen(true)} style={{ display: "flex", alignItems: "center", gap: "7px", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
            <Plus size={13} color={C.outline} /><span style={{ fontSize: "0.75rem", fontWeight: 600, color: C.outline }}>Nuevo ingreso fijo...</span>
        </button>
    );

    return (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: "9px", background: C.surface, padding: "12px", borderRadius: "12px", border: `1px solid ${C.outlineVariant}` }}>
            <div>
                <label style={feLabelStyle}>Nombre</label>
                <input autoFocus placeholder="Ej. Sueldo" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={feInputStyle} />
            </div>
            <div>
                <label style={feLabelStyle}>Frecuencia</label>
                <FrequencyToggle frequency={frequency} setFrequency={setFrequency} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
                <div>
                    <label style={feLabelStyle}>Monto</label>
                    <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={feInputStyle} />
                </div>
                {frequency === 'weekly' ? (
                    <div>
                        <label style={feLabelStyle}>Día de la semana</label>
                        <select value={dueWeekday} onChange={e => setDueWeekday(Number(e.target.value))} style={{ ...feInputStyle, fontWeight: 700, cursor: "pointer" }}>
                            {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
                        </select>
                    </div>
                ) : (
                    <div>
                        <label style={feLabelStyle}>Día de cobro</label>
                        <input type="number" placeholder="—" disabled={dueDay === 0} value={dueDay === 0 ? "" : dueDay || ""} onChange={e => setDueDay(e.target.value ? Number(e.target.value) : undefined)} min="1" max="31" style={feInputStyle} />
                        <label style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px", fontSize: "0.7rem", color: C.onSurfaceVariant, cursor: "pointer" }}>
                            <input type="checkbox" checked={dueDay === 0} onChange={e => setDueDay(e.target.checked ? 0 : undefined)} />
                            Último día del mes
                        </label>
                    </div>
                )}
            </div>
            {accounts?.length > 0 && (
                <div>
                    <label style={feLabelStyle}>¿A qué cuenta llega?</label>
                    <select value={accountId || ""} onChange={e => setAccountId(e.target.value ? Number(e.target.value) : undefined)} style={{ ...feInputStyle, fontWeight: 700, cursor: "pointer" }}>
                        <option value="">Sin cuenta asignada</option>
                        {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "2px" }}>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: `1px solid ${C.outlineVariant}`, color: C.onSurfaceVariant, borderRadius: "9px", padding: "7px 14px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Cancelar</button>
                <button onClick={submit} style={{ padding: "7px 14px", borderRadius: "9px", border: "none", background: C.secondary, color: "white", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer" }}>Agregar</button>
            </div>
        </motion.div>
    );
};
