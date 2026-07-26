import { useState, useMemo } from "react";
import {
    Wallet, Plus, TrendingUp, TrendingDown,
    Trash2, Edit2, PieChart, X,
    UserMinus, UserPlus, Check, PiggyBank, ArrowDownCircle,
    BarChart3, Tag, MoreVertical, Merge
} from "lucide-react";
import { AnalyticsView } from "./AnalyticsView";
import { motion, AnimatePresence } from "framer-motion";
import { ProjectDetailView } from "./ProjectDetailView";
import type { Transaction, FixedExpense, Project, Routine, UserPreferences } from "../../hooks/useAlDiaState";
import { C, bento, etiqueta, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina, botonPrimario, TOQUE_MINIMO } from "../../theme";
import { RegistroMovimiento } from "../features/RegistroMovimiento";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface FinanzasProps {
    balance: number;
    todayNet: number;
    todayIncomeReal: number;
    todayExpenseReal: number;
    totalIncomeReal: number;
    totalExpenseReal: number;
    totalNetReal: number;
    owe: number;
    owed: number;
    transactions: Transaction[];
    monthlyBudget: number;
    updateMonthlyBudget: (amount: number) => void;
    fixedExpenses: FixedExpense[];
    addFixedExpense: (text: string, amount: number, projectId?: number, dueDay?: number) => void;
    removeFixedExpense: (id: number) => void;
    toggleFixedExpense: (id: number) => void;
    updateFixedExpense: (id: number, updates: Partial<FixedExpense>) => void;
    markFixedExpensePaid: (id: number, monthStr: string, accountId?: number) => void;
    unmarkFixedExpensePaid: (id: number, monthStr: string) => void;
    repayDebt: (originalTx: Transaction, amount: number, accountId: number) => void;
    removeTransaction: (id: number) => void;
    updateTransactionGroup: (oldText: string, oldContact: string | undefined, updates: { text?: string, contact?: string, amount?: number }, originalId: number) => void;
    addTransaction: (text: string, amount: number, type: "ingreso" | "gasto", isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean, category?: string, contact?: string) => void;
    projects: Project[];
    accounts: { id: number, name: string, color: string, projectIds?: number[] }[];
    setAccounts: React.Dispatch<React.SetStateAction<{ id: number; name: string; color: string; projectIds?: number[] }[]>>;
    addProjectTask: (projectId: number, text: string) => void;
    toggleProjectTask: (projectId: number, taskId: number) => void;
    removeProjectTask: (projectId: number, taskId: number) => void;
    updateProjectTask: (projectId: number, taskId: number, updates: Partial<{ text: string, completed: boolean }>) => void;
    reorderProjectTasks?: (projectId: number, newTasks: any[]) => void;
    promoteTaskToRoutine: (projectId: number, taskId: number, routineId: number) => void;
    rutinas: Routine[];
    addProjectCategory?: (projectId: number, type: "ingreso" | "gasto", categoryName: string) => void;
    removeProjectCategory?: (projectId: number, type: "ingreso" | "gasto", categoryName: string) => void;
    addInventoryItem?: (projectId: number, text: string, qty: number) => void;
    updateInventoryItemQuantity?: (projectId: number, itemId: number, delta: number) => void;
    removeInventoryItem?: (projectId: number, itemId: number) => void;
    updateProject: (id: number, updates: Partial<Project>) => void;
    setSelectedProjectDetailId?: (id: number | null) => void;
    preferences: UserPreferences;
    updatePreference: (key: keyof UserPreferences, value: any) => void;
    onNavigate?: (tab: string) => void;
    incomeCategories?: string[];
    expenseCategories?: string[];
    addCategory?: (type: "ingreso" | "gasto", name: string) => void;
    removeCategory?: (type: "ingreso" | "gasto", name: string) => void;
    renameCategory?: (type: "ingreso" | "gasto", oldName: string, newName: string) => void;
    mergeCategory?: (type: "ingreso" | "gasto", sourceName: string, targetName: string) => void;
}

export type PeriodMode = "day" | "week" | "month" | "year" | "all";
export type TxFilter = "all" | "ingreso" | "gasto";

// Misma tarjeta que Plan/Checklist (bento), con el padding que ya usaban
// estos bloques. El borde de color que cada sección añade encima
// se mantiene: es el mismo lenguaje de acento que usa Checklist en sus categorías.
const CARD: React.CSSProperties = { ...bento, padding: "1.5rem" };

// Tarjeta con un acento de color en el borde izquierdo. Fija los otros tres
// lados con el mismo valor que bento.border en vez de dejar un `border`
// shorthand y un `borderLeft` sueltos compitiendo: mezclarlos hace que React
// avise de conflicto de estilos en cada rerender.
const cardConAcento = (color: string): React.CSSProperties => ({
    ...CARD,
    border: undefined,
    borderTop: bento.border,
    borderRight: bento.border,
    borderBottom: bento.border,
    borderLeft: `4px solid ${color}`,
});
// Mismo estilo de etiqueta que usan Plan y Checklist para encabezar secciones.
const LABEL: React.CSSProperties = etiqueta;

// Las tres lecturas de las mismas finanzas. No son lo mismo:
//   real       → lo que ya pasó
//   proyeccion → lo que debería pasar si todo va como siempre
//   simulador  → "¿y si...?", con los toggles de incluir/excluir
type VistaFinanzas = "real" | "proyeccion" | "simulador";

const VISTAS: { id: VistaFinanzas; label: string; sub: string }[] = [
    { id: "real",       label: "Real",       sub: "Lo que ya pasó" },
    { id: "proyeccion", label: "Proyección", sub: "Lo que debería pasar" },
    { id: "simulador",  label: "Simulador",  sub: "¿Qué pasaría si...?" },
];

const CircleCheckbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            border: `1.5px solid ${checked ? C.secondary : C.outline}`,
            background: checked ? C.secondary : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.15s ease",
            flexShrink: 0,
        }}
    >
        {checked && <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "white" }} />}
    </div>
);

// Número protagonista de cada bloque (Real/Proyección/Simulador): antes competía
// en la misma grilla que los otros 10 datos y se perdía. Se saca aparte para que
// se lea de un vistazo cuál es "el resultado" antes de entrar al detalle. Es el
// único lugar del bloque donde el color todavía carga significado (positivo/negativo);
// el detalle de abajo usa un solo color neutro para no competir con él.
const HeroStat = ({ label, val, color, sub, bg }: { label: string; val: number; color: string; sub?: string; bg: string }) => (
    <div style={{ flex: "1 1 0", minWidth: 0, background: bg, borderRadius: "14px", padding: "10px 12px" }}>
        <div style={{ ...etiqueta, color, marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "2px", color }}>
            <span style={{ fontSize: "clamp(0.65rem, 3vw, 0.8rem)", fontWeight: 800 }}>S/ </span>
            <span style={{ fontSize: "clamp(1.05rem, 5.5vw, 1.45rem)", fontWeight: 900, lineHeight: 1 }}>{val.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
        {sub && <span style={{ fontSize: "0.6rem", color: C.outline, marginTop: "2px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
    </div>
);

// dotColor es solo un indicador chico de categoría (ingreso/gasto/deuda);
// el número en sí queda siempre en el mismo tono neutro — así no compite
// por atención con los HeroStat de arriba, que son los que sí deben saltar a la vista.
type StatCellData = { label: string; val: number; dotColor?: string; sub?: string; checked?: boolean; onToggle?: () => void; opacity?: number };

const StatCell = ({ label, val, dotColor, sub, checked, onToggle, opacity, bordered }: StatCellData & { bordered?: boolean }) => (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", opacity: opacity ?? 1, transition: "opacity 0.2s", borderLeft: bordered ? `1px solid ${C.outlineVariant}` : "none", paddingLeft: bordered ? "0.6rem" : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "0.15rem" }}>
            {onToggle && <CircleCheckbox checked={checked ?? false} onChange={onToggle} />}
            {dotColor && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: dotColor, display: "inline-block", flexShrink: 0 }} />}
            <span style={etiqueta}>{label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "1px", color: C.onSurface }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.onSurfaceVariant }}>S/ </span>
            <span style={{ fontSize: "1.05rem", fontWeight: 800, lineHeight: 1 }}>{val.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
        </div>
        {sub && <span style={{ fontSize: "0.56rem", color: C.outline, marginTop: "1px" }}>{sub}</span>}
    </div>
);

// Antes las 11 métricas vivían en una sola grilla plana, todas con el mismo peso
// visual: no se distinguía "Ingresos" de "Deudas" de "Balance Neto" a simple vista.
// Agruparlas por categoría (con su propio título) restaura esa jerarquía sin
// perder ningún dato ni los toggles de incluir/excluir.
const StatSection = ({ title, items }: { title: string; items: StatCellData[] }) => (
    <div>
        <div style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: "6px" }}>{title}</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 0 }}>
            {items.map((it, i) => <StatCell key={i} {...it} bordered={i > 0} />)}
        </div>
    </div>
);

// Antes el ícono de borrar vivía suelto en cada tarjeta de cuenta (un tap
// accidental la eliminaba sin abrir nada más). Ahora la tarjeta abre este
// detalle: el nombre y color se editan ahí, "Eliminar" queda un nivel más
// adentro (menú de opciones), y de paso se ve el historial de esa cuenta.
const AccountDetailModal = ({
    account, transactions, projects, onClose, onRename, onChangeColor, onDelete,
}: {
    account: { id: number; name: string; color: string; balance: number; projectIds?: number[] };
    transactions: Transaction[];
    projects: Project[];
    onClose: () => void;
    onRename: (name: string) => void;
    onChangeColor: (color: string) => void;
    onDelete: () => void;
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState(account.name);

    const txs = useMemo(() =>
        transactions.filter(t => t.accountId === account.id && !t.isCashless).sort((a, b) => b.fullDate.localeCompare(a.fullDate)),
        [transactions, account.id]);

    const linkedProjects = useMemo(() =>
        projects.filter(p => account.projectIds?.includes(p.id)),
        [projects, account.projectIds]);

    const saveName = () => {
        const trimmed = nameDraft.trim();
        if (trimmed && trimmed !== account.name) onRename(trimmed);
        setEditingName(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(3px)", zIndex: 9997, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.96 }}
                style={{ background: "white", borderRadius: "20px", padding: "20px", width: "100%", maxWidth: "420px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", position: "relative" }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                        <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: account.color, flexShrink: 0 }} />
                        {editingName ? (
                            <input
                                autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setNameDraft(account.name); setEditingName(false); } }}
                                onBlur={saveName}
                                style={{ fontSize: "1.1rem", fontWeight: 800, border: "none", borderBottom: `2px solid ${C.secondary}`, outline: "none", padding: "2px 0", flex: 1, minWidth: 0, fontFamily: "inherit" }}
                            />
                        ) : (
                            <span style={{ fontSize: "1.1rem", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.name}</span>
                        )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                        <div style={{ position: "relative" }}>
                            <button onClick={() => setMenuOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.onSurfaceVariant, padding: "4px", display: "flex" }}>
                                <MoreVertical size={18} />
                            </button>
                            <AnimatePresence>
                                {menuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                        style={{ position: "absolute", top: "28px", right: 0, background: "white", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: `1px solid ${C.outlineVariant}`, overflow: "hidden", zIndex: 10, minWidth: "180px" }}
                                    >
                                        <button onClick={() => { setEditingName(true); setMenuOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: C.onSurface, textAlign: "left", fontFamily: "inherit" }}>
                                            <Edit2 size={14} /> Renombrar
                                        </button>
                                        <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", fontSize: "0.82rem", fontWeight: 600, color: C.onSurface, cursor: "pointer" }}>
                                            <input type="color" value={account.color} onChange={e => onChangeColor(e.target.value)} style={{ width: "14px", height: "14px", padding: 0, border: "none", cursor: "pointer" }} />
                                            Cambiar color
                                        </label>
                                        <button onClick={() => { setMenuOpen(false); onDelete(); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "none", border: "none", borderTop: `1px solid ${C.outlineVariant}`, cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: C.rojo, textAlign: "left", fontFamily: "inherit" }}>
                                            <Trash2 size={14} /> Eliminar cuenta
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.onSurfaceVariant, padding: "4px", display: "flex" }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div style={{ background: `${account.color}14`, borderRadius: "14px", padding: "16px", marginBottom: "1.2rem" }}>
                    <div style={{ ...etiqueta, color: account.color, marginBottom: "4px" }}>Saldo</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 900, color: C.onSurface }}>S/ {account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                </div>

                <div style={{ marginBottom: "1.2rem" }}>
                    <div style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: "8px" }}>
                        Proyectos vinculados
                    </div>
                    {linkedProjects.length === 0 ? (
                        <p style={{ fontSize: "0.78rem", color: C.outline, fontStyle: "italic", margin: 0 }}>Sin proyectos vinculados.</p>
                    ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {linkedProjects.map(p => (
                                <span key={p.id} style={{ display: "flex", alignItems: "center", gap: "5px", background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: "999px", padding: "4px 10px 4px 8px", fontSize: "0.75rem", fontWeight: 700, color: C.onSurfaceVariant }}>
                                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: p.color, display: "inline-block" }} />
                                    {p.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.onSurfaceVariant, marginBottom: "8px" }}>
                    Movimientos ({txs.length})
                </div>
                {txs.length === 0 ? (
                    <p style={{ fontSize: "0.8rem", color: C.outline, fontStyle: "italic", textAlign: "center", padding: "1.5rem 0" }}>Sin movimientos en esta cuenta todavía.</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {txs.slice(0, 30).map(tx => (
                            <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "10px", background: C.surface, border: `1px solid ${C.surfaceContainerLow}` }}>
                                <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: tx.type === "ingreso" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: tx.type === "ingreso" ? C.verde : C.rojo, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {tx.type === "ingreso" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.text}</div>
                                    <div style={{ fontSize: "0.6rem", color: C.outline }}>{tx.fullDate}</div>
                                </div>
                                <span style={{ fontWeight: 800, fontSize: "0.8rem", color: tx.type === "ingreso" ? C.verde : C.rojo, flexShrink: 0 }}>
                                    {tx.type === "ingreso" ? "+" : "-"}S/ {Math.abs(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

// ---------- helpers ----------
export function getPeriodBounds(mode: PeriodMode, ref: Date): { start: string; end: string } {
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (mode === "all") return { start: "0000-01-01", end: "9999-12-31" };
    if (mode === "day") return { start: fmt(ref), end: fmt(ref) };
    if (mode === "week") {
        const day = ref.getDay();
        const mon = new Date(ref); mon.setDate(ref.getDate() - ((day + 6) % 7));
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        return { start: fmt(mon), end: fmt(sun) };
    }
    if (mode === "month") {
        const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
        const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
        return { start: fmt(first), end: fmt(last) };
    }
    return { start: `${ref.getFullYear()}-01-01`, end: `${ref.getFullYear()}-12-31` };
}

export function periodLabel(mode: PeriodMode, ref: Date): string {
    if (mode === "all") return "Todo el historial";
    if (mode === "day") return ref.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    if (mode === "week") {
        const { start, end } = getPeriodBounds("week", ref);
        return `${start.slice(5)} → ${end.slice(5)}`;
    }
    if (mode === "month") return ref.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    return String(ref.getFullYear());
}

export function shiftPeriod(mode: PeriodMode, ref: Date, dir: -1 | 1): Date {
    const d = new Date(ref);
    if (mode === "day") d.setDate(d.getDate() + dir);
    if (mode === "week") d.setDate(d.getDate() + dir * 7);
    if (mode === "month") d.setMonth(d.getMonth() + dir);
    if (mode === "year") d.setFullYear(d.getFullYear() + dir);
    return d;
}

// ─── Main component ───────────────────────────────────────────────────────────
export const FinanzasDashboard = ({
    balance, transactions,
    fixedExpenses, addFixedExpense, removeFixedExpense, toggleFixedExpense, updateFixedExpense,
    markFixedExpensePaid, unmarkFixedExpensePaid,
    removeTransaction, addTransaction,
    projects, accounts, setAccounts,
    addProjectTask, toggleProjectTask, removeProjectTask, updateProjectTask,
    reorderProjectTasks, promoteTaskToRoutine, rutinas,
    addProjectCategory, removeProjectCategory,
    addInventoryItem, updateInventoryItemQuantity, removeInventoryItem,
    updateProject,
    preferences, updatePreference,
    onNavigate,
    incomeCategories, expenseCategories, addCategory, removeCategory, renameCategory, mergeCategory,
}: FinanzasProps) => {
    const currentMonthStr = useMemo(() => new Date().toLocaleDateString("en-CA").substring(0, 7), []);

    // ── Config ────────────────────────────────────────────────────────────
    const [includeDebts, setIncludeDebts] = useState(false);
    const [includeFixed, setIncludeFixed] = useState(true);
    const [includeOwed, setIncludeOwed] = useState(false);
    const [includeBalance, setIncludeBalance] = useState(true);
    const [includeSalary, setIncludeSalary] = useState(true);
    const [topPeriod, setTopPeriod] = useState<PeriodMode>("month");
    const [debtActiveMap, setDebtActiveMap] = useState<Record<string, boolean>>({});

    // ── Debt groups (corrected: subtracts payments) ───────────────────────
    const activeDebtsAndCollections = useMemo(() => {
        const relevant = transactions.filter(t => t.isDebt);
        const groups: Record<string, { total: number; originalTx: Transaction; isOwe: boolean }> = {};
        relevant.forEach(tx => {
            const baseText = tx.text.startsWith("Pago: ") ? tx.text.replace("Pago: ", "") : tx.text;
            const contact = tx.contact || "";
            const key = contact ? `${contact}::${baseText}` : `::${baseText}`;
            const isPayment = tx.text.startsWith("Pago: ");
            if (!groups[key]) {
                const isOwe = isPayment ? (tx.type === "ingreso") : (tx.type === "gasto");
                groups[key] = { total: 0, originalTx: tx, isOwe };
            }
            if (isPayment) groups[key].total -= Math.abs(tx.amount);
            else { groups[key].total += Math.abs(tx.amount); groups[key].originalTx = tx; }
        });
        return Object.entries(groups)
            .filter(([_, d]) => d.total > 0.01)
            .map(([key, d]) => {
                const [contact, text] = key.split("::");
                return { name: text, contact, amount: d.total, isOwe: d.isOwe, originalTx: d.originalTx };
            });
    }, [transactions]);

    const realOwe = useMemo(() => activeDebtsAndCollections.filter(d => d.isOwe).reduce((s, d) => s + d.amount, 0), [activeDebtsAndCollections]);
    const realOwed = useMemo(() => activeDebtsAndCollections.filter(d => !d.isOwe).reduce((s, d) => s + d.amount, 0), [activeDebtsAndCollections]);
    const activeOweTotal = useMemo(() =>
        activeDebtsAndCollections.filter(d => d.isOwe && (debtActiveMap[d.name + "::" + (d.contact || "")] ?? true)).reduce((s, d) => s + d.amount, 0),
        [activeDebtsAndCollections, debtActiveMap]);
    const activeOwedTotal = useMemo(() =>
        activeDebtsAndCollections.filter(d => !d.isOwe && (debtActiveMap[d.name + "::" + (d.contact || "")] ?? true)).reduce((s, d) => s + d.amount, 0),
        [activeDebtsAndCollections, debtActiveMap]);

    const monthlyFixedTotal = useMemo(() =>
        fixedExpenses.filter(e => e.active).reduce((a, e) => a + e.amount, 0),
        [fixedExpenses]);

    const fixedExpensePaidTotal = useMemo(() =>
        fixedExpenses.filter(e => e.active && e.lastPaidMonth === currentMonthStr).reduce((a, e) => a + e.amount, 0),
        [fixedExpenses, currentMonthStr]);

    const totalFixedPending = useMemo(() =>
        fixedExpenses.filter(e => e.active && e.lastPaidMonth !== currentMonthStr).reduce((a, e) => a + e.amount, 0),
        [fixedExpenses, currentMonthStr]);

    // ── Fixed incomes (stored in preferences as JSON) ─────────────────────
    type FixedIncomeItem = { id: number; name: string; amount: number; active: boolean; lastReceivedMonth?: string };
    const fixedIncomeItems: FixedIncomeItem[] = useMemo(() => {
        try { return JSON.parse(preferences.fixedIncomes || "[]"); } catch { return []; }
    }, [preferences.fixedIncomes]);
    const saveFixedIncomes = (items: FixedIncomeItem[]) =>
        updatePreference("fixedIncomes", JSON.stringify(items));
    const addFixedIncome = (name: string, amount: number) =>
        saveFixedIncomes([...fixedIncomeItems, { id: Date.now(), name, amount, active: true }]);
    const removeFixedIncome = (id: number) =>
        saveFixedIncomes(fixedIncomeItems.filter(f => f.id !== id));
    const toggleFixedIncome = (id: number) =>
        saveFixedIncomes(fixedIncomeItems.map(f => f.id === id ? { ...f, active: !f.active } : f));
    const updateFixedIncome = (id: number, name: string, amount: number) =>
        saveFixedIncomes(fixedIncomeItems.map(f => f.id === id ? { ...f, name, amount } : f));
    const markFixedIncomeReceived = (id: number, monthStr: string) => {
        const item = fixedIncomeItems.find(f => f.id === id);
        if (!item) return;
        saveFixedIncomes(fixedIncomeItems.map(f => f.id === id ? { ...f, lastReceivedMonth: monthStr } : f));
        if (item.lastReceivedMonth !== monthStr) {
            addTransaction(`Depósito: ${item.name}`, item.amount, 'ingreso', false, undefined, undefined, false, 'Sueldo');
        }
    };
    const unmarkFixedIncomeReceived = (id: number, monthStr: string) => {
        const item = fixedIncomeItems.find(f => f.id === id);
        if (!item) return;
        saveFixedIncomes(fixedIncomeItems.map(f => f.id === id ? { ...f, lastReceivedMonth: undefined } : f));
        const targetTxPrefix = `Depósito: ${item.name}`;
        const matchedTx = transactions.find(t => t.text === targetTxPrefix && t.fullDate.startsWith(monthStr) && Number(t.amount) === item.amount);
        if (matchedTx) {
            removeTransaction(matchedTx.id);
        }
    };
    const fixedIncomeTotal = useMemo(() =>
        fixedIncomeItems.filter(f => f.active).reduce((s, f) => s + f.amount, 0),
        [fixedIncomeItems]);

    const [isAddingIncome, setIsAddingIncome] = useState(false);
    const [newIncomeName, setNewIncomeName] = useState("");
    const [newIncomeAmount, setNewIncomeAmount] = useState("");
    const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null);
    const [editIncomeName, setEditIncomeName] = useState("");
    const [editIncomeAmount, setEditIncomeAmount] = useState("");
    const toggleDebtActive = (key: string) => setDebtActiveMap(m => ({ ...m, [key]: !(m[key] ?? true) }));
    const [payInputs, setPayInputs] = useState<Record<string, string>>({});
    const [payOpen, setPayOpen] = useState<Record<string, boolean>>({});
    const handlePay = (key: string, amount: number, d: typeof activeDebtsAndCollections[0]) => {
        if (amount <= 0) return;
        // Transacción REAL: aparece en topTxs (finanzas) y en periodBalance
        addTransaction(`Pago: ${d.name}`, d.isOwe ? -amount : amount, d.isOwe ? 'gasto' : 'ingreso', false, undefined, accounts[0]?.id, false, 'Deudas', d.contact);
        // Transacción de seguimiento: reduce la deuda en el grouping, sin afectar balance (isCashless: true)
        addTransaction(`Pago: ${d.name}`, d.isOwe ? -amount : amount, d.isOwe ? 'gasto' : 'ingreso', true, undefined, undefined, true, 'Deudas', d.contact);
        setPayInputs(m => ({ ...m, [key]: '' }));
        setPayOpen(m => ({ ...m, [key]: false }));
    };
    const submitNewIncome = () => {
        if (newIncomeName.trim() && newIncomeAmount) {
            addFixedIncome(newIncomeName.trim(), parseFloat(newIncomeAmount));
            setNewIncomeName(""); setNewIncomeAmount(""); setIsAddingIncome(false);
        }
    };

    const periodMultiplier = useMemo(() => {
        if (topPeriod === "day") return 1 / 30;
        if (topPeriod === "week") return 7 / 30;
        if (topPeriod === "month") return 1;
        if (topPeriod === "year") return 12;
        return 1;
    }, [topPeriod]);

    const projectedFixedVal = useMemo(() => {
        if (topPeriod === "month" || topPeriod === "all") return totalFixedPending;
        if (topPeriod === "day") return monthlyFixedTotal / 30;
        if (topPeriod === "week") return (monthlyFixedTotal * 7) / 30;
        return monthlyFixedTotal * 12; // "year"
    }, [topPeriod, totalFixedPending, monthlyFixedTotal]);

    const projectedPeriodLabel = useMemo(() => {
        if (topPeriod === "day") return "Proyección del día";
        if (topPeriod === "week") return "Proyección de la sem.";
        if (topPeriod === "year") return "Proyección del año";
        return "Proyección del mes";
    }, [topPeriod]);

    const periodBalance = useMemo(() => {
        if (topPeriod === "all") return balance;
        const { start, end } = getPeriodBounds(topPeriod, new Date());
        return transactions
            .filter(tx => !tx.isCashless && tx.fullDate >= start && tx.fullDate <= end)
            .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    }, [transactions, topPeriod, balance]);

    const projectedResources = (includeBalance ? periodBalance : 0) + (includeSalary ? fixedIncomeTotal * periodMultiplier : 0) + (includeOwed ? activeOwedTotal : 0);
    const projectedExpenses = (includeFixed ? projectedFixedVal : 0) + (includeDebts ? activeOweTotal : 0);
    const projectedSavings = projectedResources - projectedExpenses;

    const totalIncomePending = useMemo(() =>
        fixedIncomeItems.filter(f => f.active && f.lastReceivedMonth !== currentMonthStr).reduce((s, f) => s + f.amount, 0),
        [fixedIncomeItems, currentMonthStr]);

    const projectedIncomeVal = useMemo(() => {
        if (topPeriod === "month" || topPeriod === "all") return totalIncomePending;
        if (topPeriod === "day") return fixedIncomeTotal / 30;
        if (topPeriod === "week") return (fixedIncomeTotal * 7) / 30;
        return fixedIncomeTotal * 12; // "year"
    }, [topPeriod, totalIncomePending, fixedIncomeTotal]);

    const adjustedSavings = useMemo(() => {
        const res = (includeBalance ? periodBalance : 0) + (includeSalary ? projectedIncomeVal : 0) + (includeOwed ? activeOwedTotal : 0);
        const exp = (includeFixed ? projectedFixedVal : 0) + (includeDebts ? activeOweTotal : 0);
        return res - exp;
    }, [includeBalance, periodBalance, includeSalary, projectedIncomeVal, includeOwed, activeOwedTotal, includeFixed, projectedFixedVal, includeDebts, activeOweTotal]);

    const topTxs = useMemo(() => {
        const { start, end } = getPeriodBounds(topPeriod, new Date());
        return transactions.filter(tx => !tx.isDebt && tx.fullDate >= start && tx.fullDate <= end);
    }, [transactions, topPeriod]);

    const topIncome = useMemo(() =>
        topTxs.filter(tx => tx.type === "ingreso").reduce((s, tx) => s + (Number(tx.amount) || 0), 0),
        [topTxs]);

    const topExpense = useMemo(() =>
        topTxs.filter(tx => tx.type === "gasto").reduce((s, tx) => s + Math.abs(Number(tx.amount) || 0), 0),
        [topTxs]);

    const activeFixedIncomeNames = useMemo(() =>
        new Set(fixedIncomeItems.filter(f => f.active).map(f => `Depósito: ${f.name}`)),
        [fixedIncomeItems]);

    const fixedIncomeActual = useMemo(() =>
        topTxs.filter(tx => tx.type === "ingreso" && activeFixedIncomeNames.has(tx.text)).reduce((s, tx) => s + (Number(tx.amount) || 0), 0),
        [topTxs, activeFixedIncomeNames]);

    const variableIncomeActual = useMemo(() => topIncome - fixedIncomeActual, [topIncome, fixedIncomeActual]);

    const fixedExpenseActual = useMemo(() => {
        if (topPeriod === "day") return fixedExpensePaidTotal / 30;
        if (topPeriod === "week") return (fixedExpensePaidTotal * 7) / 30;
        if (topPeriod === "year") return fixedExpensePaidTotal * 12;
        return fixedExpensePaidTotal;
    }, [topPeriod, fixedExpensePaidTotal]);

    const variableExpenseActual = useMemo(() => topExpense - fixedExpenseActual, [topExpense, fixedExpenseActual]);

    const fixedExpenseProyectado = useMemo(() => {
        if (topPeriod === "day") return monthlyFixedTotal / 30;
        if (topPeriod === "week") return (monthlyFixedTotal * 7) / 30;
        if (topPeriod === "year") return monthlyFixedTotal * 12;
        return monthlyFixedTotal;
    }, [topPeriod, monthlyFixedTotal]);


    const projectedIncomeTotal = useMemo(() => (fixedIncomeTotal * periodMultiplier) + variableIncomeActual, [fixedIncomeTotal, periodMultiplier, variableIncomeActual]);
    const projectedExpenseTotal = useMemo(() => fixedExpenseProyectado + variableExpenseActual, [fixedExpenseProyectado, variableExpenseActual]);

    const topPeriodDetails = useMemo(() => {
        const mapping = {
            day: { label: "Ingresos (Día)", labelExp: "Gastos (Día)", sub: "Recibido hoy", subExp: "Gastado hoy" },
            week: { label: "Ingresos (Sem.)", labelExp: "Gastos (Sem.)", sub: "Recibido sem.", subExp: "Gastado sem." },
            month: { label: "Ingresos (Mes)", labelExp: "Gastos (Mes)", sub: "Recibido real", subExp: "Gastado real" },
            year: { label: "Ingresos (Año)", labelExp: "Gastos (Año)", sub: "Recibido año", subExp: "Gastado año" },
            all: { label: "Ingresos (Total)", labelExp: "Gastos (Total)", sub: "Historial total", subExp: "Historial total" },
        };
        return mapping[topPeriod];
    }, [topPeriod]);

    // ── UI state ──────────────────────────────────────────────────────────
    // La vista activa decide cuál de las tres lecturas se muestra.
    // "Ver todo" las abre las tres juntas para poder compararlas.
    const movil = useIsMobile();
    const [vista, setVista] = useState<VistaFinanzas>("real");
    const [verTodo, setVerTodo] = useState(false);
    // El alta de movimiento se dispara desde el botón de la cabecera.
    const [showTxForm, setShowTxForm] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [chartPeriod, setChartPeriod] = useState<"7d" | "30d">("7d");

    // ── Accounts ──────────────────────────────────────────────────────────
    const accountsWithBalance = useMemo(() =>
        accounts.map(acc => ({
            ...acc,
            balance: transactions.filter(tx => tx.accountId === acc.id && !tx.isCashless).reduce((s, tx) => s + (Number(tx.amount) || 0), 0)
        })), [accounts, transactions]);

    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [newAccountName, setNewAccountName] = useState("");
    const [newAccountColor, setNewAccountColor] = useState("#0055FF");
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

    // ── Categorías ────────────────────────────────────────────────────────
    const [isCategoriesVisible, setIsCategoriesVisible] = useState(false);
    const [categoryTab, setCategoryTab] = useState<"gasto" | "ingreso">("gasto");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(null);
    const [categoryMenuMode, setCategoryMenuMode] = useState<"root" | "merge">("root");
    const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState("");
    const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<string | null>(null);

    const handleAddCategory = () => {
        if (!newCategoryName.trim() || !addCategory) return;
        addCategory(categoryTab, newCategoryName.trim());
        setNewCategoryName("");
    };

    const closeCategoryMenu = () => { setActiveMenuCategory(null); setCategoryMenuMode("root"); };

    const startRenameCategory = (cat: string) => {
        setRenameDraft(cat);
        setRenamingCategory(cat);
        closeCategoryMenu();
    };

    const saveRenameCategory = () => {
        const trimmed = renameDraft.trim();
        if (renamingCategory && renameCategory && trimmed && trimmed !== renamingCategory) {
            renameCategory(categoryTab, renamingCategory, trimmed);
        }
        setRenamingCategory(null);
    };

    const handleMergeCategory = (source: string, target: string) => {
        mergeCategory?.(categoryTab, source, target);
        closeCategoryMenu();
    };

    const handleConfirmDeleteCategory = () => {
        if (confirmDeleteCategory) removeCategory?.(categoryTab, confirmDeleteCategory);
        setConfirmDeleteCategory(null);
    };

    const handleAddAccount = () => {
        if (!newAccountName.trim()) return;
        setAccounts(prev => [...prev, { id: Date.now(), name: newAccountName, color: newAccountColor, projectIds: [] }]);
        setNewAccountName(""); setIsAddingAccount(false);
    };

    // ── Chart ─────────────────────────────────────────────────────────────
    const historyData = useMemo(() => {
        const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        const count = chartPeriod === "7d" ? 7 : 30;
        return Array.from({ length: count }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (count - 1 - i));
            const dateStr = d.toLocaleDateString("en-CA");
            const label = i === count - 1 ? "Hoy" : (chartPeriod === "7d" ? days[d.getDay()] : String(d.getDate()));
            const dayTxs = transactions.filter(tx => tx.fullDate === dateStr && !tx.isDebt);
            return {
                day: label,
                inc: dayTxs.filter(t => t.type === "ingreso").reduce((s, t) => s + (Number(t.amount) || 0), 0),
                exp: dayTxs.filter(t => t.type === "gasto").reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0),
            };
        });
    }, [transactions, chartPeriod]);

    // ─────────────────────────────────────────────────────────────────────
    /* ── Las tres lecturas, como variables para poder reutilizarlas ── */
    const bloqueReal = (
                <div style={{ ...cardConAcento(C.verde), display: "flex", flexDirection: "column", gap: "0.85rem", padding: movil ? "1rem" : cardConAcento(C.verde).padding }}>
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem", flexWrap: "wrap", gap: "8px" }}>
                            <span style={LABEL}>Situación Financiera Real</span>
                            <TrendingUp size={16} color={C.verde} />
                        </div>
                        <span style={{ fontSize: "0.65rem", color: C.outline, display: "block" }}>Ingresos y gastos reales + deudas y patrimonio — lo que ya pasó</span>
                    </div>

                    <div style={{ display: "flex", gap: movil ? "0.5rem" : "0.6rem", flexWrap: "nowrap" }}>
                        <HeroStat
                            label="Balance Neto"
                            val={topIncome - topExpense}
                            color={(topIncome - topExpense) >= 0 ? C.verde : C.rojo}
                            sub="Ingresos - Gastos"
                            bg={(topIncome - topExpense) >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)"}
                        />
                        <HeroStat
                            label="Patrimonio Neto"
                            val={periodBalance - realOwe + realOwed}
                            color={(periodBalance - realOwe + realOwed) >= 0 ? C.verde : C.rojo}
                            sub="Balance Neto + Deuda Neta"
                            bg={(periodBalance - realOwe + realOwed) >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)"}
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: movil ? "1fr" : "repeat(auto-fit, minmax(170px, 1fr))", gap: movil ? "0.85rem" : "0.85rem", paddingTop: "0.7rem", borderTop: `1px solid ${C.outlineVariant}` }}>
                        <StatSection title={topPeriodDetails.label} items={[
                            { label: "Total", val: topIncome, dotColor: C.verde, sub: topPeriodDetails.sub },
                            { label: "Fijo", val: fixedIncomeActual, dotColor: C.verde, sub: "Activos recibidos" },
                            { label: "Variable", val: variableIncomeActual, dotColor: C.verde, sub: "Ingresos directos" },
                        ]} />
                        <StatSection title={topPeriodDetails.labelExp} items={[
                            { label: "Total", val: topExpense, dotColor: C.rojo, sub: topPeriodDetails.subExp },
                            { label: "Fijo", val: fixedExpenseActual, dotColor: C.rojo, sub: "Gastos activos" },
                            { label: "Variable", val: variableExpenseActual, dotColor: C.rojo, sub: "Gastos directos" },
                        ]} />
                        <StatSection title="Deudas" items={[
                            { label: "Debo", val: realOwe, dotColor: C.rojo, sub: realOwe > 0 ? "Deudas pendientes" : "Sin deudas" },
                            { label: "Me Deben", val: realOwed, dotColor: C.verde, sub: realOwed > 0 ? "Por cobrar" : "Sin cobros" },
                            { label: "Neta", val: realOwed - realOwe, sub: "Me deben - Debo" },
                        ]} />
                    </div>
                </div>
    );

    const bloqueProyeccion = (
                <div style={{ ...cardConAcento(C.ambar), display: "flex", flexDirection: "column", gap: "0.85rem", padding: movil ? "1rem" : cardConAcento(C.ambar).padding }}>
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem", flexWrap: "wrap", gap: "8px" }}>
                            <span style={LABEL}>Proyección Financiera</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <PillToggle
                                    options={["day", "week", "month", "year", "all"]}
                                    labels={["Día", "Sem.", "Mes", "Año", "Todo"]}
                                    value={topPeriod}
                                    onChange={v => setTopPeriod(v as any)}
                                />
                                <TrendingUp size={16} color={C.verde} style={{ marginLeft: "4px" }} />
                            </div>
                        </div>
                        <span style={{ fontSize: "0.65rem", color: C.outline, display: "block" }}>Ingresos/gastos fijos proyectados + variables reales — lo que debería pasar</span>
                    </div>

                    <HeroStat
                        label="Balance Neto Proyectado"
                        val={projectedSavings}
                        color={projectedSavings >= 0 ? C.verde : C.rojo}
                        sub={projectedPeriodLabel}
                        bg={projectedSavings >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)"}
                    />

                    <div style={{ display: "grid", gridTemplateColumns: movil ? "1fr" : "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.85rem", paddingTop: "0.7rem", borderTop: `1px solid ${C.outlineVariant}` }}>
                        <StatSection title="Ingresos Proyectados" items={[
                            { label: "Total", val: projectedIncomeTotal, dotColor: C.verde, sub: "Fijos + Variables" },
                            { label: "Fijo", val: fixedIncomeTotal * periodMultiplier, dotColor: C.verde, sub: "Activos proyectados" },
                            { label: "Variable", val: variableIncomeActual, dotColor: C.verde, sub: "Ingresos directos" },
                        ]} />
                        <StatSection title="Gastos Proyectados" items={[
                            { label: "Total", val: projectedExpenseTotal, dotColor: C.rojo, sub: "Fijos + Variables" },
                            { label: "Fijo", val: fixedExpenseProyectado, dotColor: C.rojo, sub: "Gastos activos" },
                            { label: "Variable", val: variableExpenseActual, dotColor: C.rojo, sub: "Gastos directos" },
                        ]} />
                        <StatSection title="Deudas (ajustable)" items={[
                            {
                                label: "Debo",
                                val: activeOweTotal,
                                dotColor: C.rojo,
                                sub: includeDebts ? "Debo (incluido)" : "Debo (excluido)",
                                checked: includeDebts,
                                onToggle: () => setIncludeDebts(v => !v),
                                opacity: includeDebts ? 1 : 0.55
                            },
                            {
                                label: "Me Deben",
                                val: activeOwedTotal,
                                dotColor: C.verde,
                                sub: includeOwed ? "Cobros incluidos" : "Cobros excluidos",
                                checked: includeOwed,
                                onToggle: () => setIncludeOwed(v => !v),
                                opacity: includeOwed ? 1 : 0.55
                            },
                        ]} />
                    </div>
                </div>
    );

    const bloqueSimulador = (
                <div style={{ ...cardConAcento(C.secondary), display: "flex", flexDirection: "column", gap: "0.85rem", padding: movil ? "1rem" : cardConAcento(C.secondary).padding }}>
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.15rem", flexWrap: "wrap", gap: "8px" }}>
                            <span style={LABEL}>Ejecución y Proyección Ajustada</span>
                            <TrendingUp size={16} color={C.secondary} style={{ marginLeft: "4px" }} />
                        </div>
                        <span style={{ fontSize: "0.65rem", color: C.outline, display: "block" }}>Mix ajustable con toggles — incluí/excluí fijos, deudas y cobros</span>
                    </div>

                    <HeroStat
                        label="Balance Neto Proyectado"
                        val={adjustedSavings}
                        color={adjustedSavings >= 0 ? C.verde : C.rojo}
                        sub={projectedPeriodLabel}
                        bg={adjustedSavings >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)"}
                    />

                    <div style={{ display: "grid", gridTemplateColumns: movil ? "1fr" : "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.85rem", paddingTop: "0.7rem", borderTop: `1px solid ${C.outlineVariant}` }}>
                        <StatSection title="Movimiento del Período" items={[
                            { label: topPeriodDetails.label, val: topIncome, dotColor: C.verde, sub: topPeriodDetails.sub },
                            { label: topPeriodDetails.labelExp, val: topExpense, dotColor: C.rojo, sub: topPeriodDetails.subExp },
                        ]} />
                        <StatSection title="Recursos Ajustables" items={[
                            {
                                label: "Saldo Actual",
                                val: periodBalance,
                                dotColor: C.verde,
                                sub: includeBalance ? "Disponible" : "Excluido",
                                checked: includeBalance,
                                onToggle: () => setIncludeBalance(v => !v),
                                opacity: includeBalance ? 1 : 0.55
                            },
                            {
                                label: "Ingreso Fijo",
                                val: projectedIncomeVal,
                                dotColor: fixedIncomeTotal > 0 ? C.verde : undefined,
                                sub: fixedIncomeTotal > 0
                                    ? (includeSalary
                                        ? (topPeriod === "month" || topPeriod === "all"
                                            ? `Pendiente: S/ ${projectedIncomeVal.toFixed(0)} / Total: S/ ${fixedIncomeTotal.toFixed(0)}`
                                            : "Fijos proyectados")
                                        : "Fijos excluidos")
                                    : "Sin ingresos fijos",
                                checked: fixedIncomeTotal > 0 ? includeSalary : false,
                                onToggle: fixedIncomeTotal > 0 ? (() => setIncludeSalary(v => !v)) : undefined,
                                opacity: fixedIncomeTotal === 0 ? 0.5 : (includeSalary ? 1 : 0.55)
                            },
                            {
                                label: "Ingresos Proy.",
                                val: periodBalance + (includeSalary ? projectedIncomeVal : 0),
                                sub: "Neto + proyectado"
                            },
                        ]} />
                        <StatSection title="Gastos y Deudas Ajustables" items={[
                            {
                                label: "Gastos Fijos",
                                val: projectedFixedVal,
                                dotColor: C.rojo,
                                sub: includeFixed
                                    ? (topPeriod === "month" || topPeriod === "all"
                                        ? `Pendiente: S/ ${projectedFixedVal.toFixed(0)} / Total: S/ ${monthlyFixedTotal.toFixed(0)}`
                                        : "Fijos proyectados")
                                    : "Fijos excluidos",
                                checked: includeFixed,
                                onToggle: () => setIncludeFixed(v => !v),
                                opacity: includeFixed ? 1 : 0.55
                            },
                            {
                                label: "Debo",
                                val: activeOweTotal,
                                dotColor: C.rojo,
                                sub: includeDebts ? "Debo (incluido)" : "Debo (excluido)",
                                checked: includeDebts,
                                onToggle: () => setIncludeDebts(v => !v),
                                opacity: includeDebts ? 1 : 0.55
                            },
                            {
                                label: "Me Deben",
                                val: activeOwedTotal,
                                dotColor: C.verde,
                                sub: includeOwed ? "Cobros incluidos" : "Cobros excluidos",
                                checked: includeOwed,
                                onToggle: () => setIncludeOwed(v => !v),
                                opacity: includeOwed ? 1 : 0.55
                            },
                        ]} />
                    </div>
                </div>
    );

    return (
        <div style={{
            display: "flex", flexDirection: "column",
            gap: movil ? "1rem" : "1.5rem",
            ...paddingPagina(movil),
            color: "var(--text-carbon)",
        }}>

            {/* ── Cabecera: título, vista, periodo y acción ─── */}
            {(() => {
                const periodPillsAndRegistrar = (
                    <div style={{
                        display: "flex", alignItems: "center", gap: movil ? "8px" : "10px", flexWrap: "nowrap",
                        justifyContent: movil ? "space-between" : undefined,
                    }}>
                        <div style={{ display: "flex", background: C.surfaceContainerLow, borderRadius: "999px", padding: "3px", border: `1px solid ${C.outlineVariant}`, overflowX: movil ? "auto" : undefined, minWidth: 0, flexShrink: movil ? 1 : undefined }}>
                            {(["day", "week", "month", "year", "all"] as PeriodMode[]).map(mode => {
                                const etiquetas: Record<PeriodMode, string> = { day: "Día", week: "Sem", month: "Mes", year: "Año", all: "Todo" };
                                const activo = topPeriod === mode;
                                return (
                                    <button
                                        key={mode}
                                        onClick={() => setTopPeriod(mode)}
                                        style={{
                                            border: "none", borderRadius: "999px", cursor: "pointer", flexShrink: 0,
                                            padding: movil ? "5px 9px" : "5px 13px", fontSize: movil ? "0.68rem" : "0.75rem", fontWeight: 700,
                                            fontFamily: "inherit", transition: "all 0.15s",
                                            background: activo ? C.secondary : "transparent",
                                            color: activo ? "#fff" : C.onSurfaceVariant,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {etiquetas[mode]}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setShowAnalytics(true)}
                            title="Analizar"
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                                background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`,
                                borderRadius: "999px", cursor: "pointer", flexShrink: 0,
                                padding: movil ? "0" : "8px 14px",
                                width: movil ? `${TOQUE_MINIMO}px` : undefined,
                                minHeight: movil ? `${TOQUE_MINIMO}px` : undefined,
                                fontSize: "0.78rem", fontWeight: 700, color: C.secondary, fontFamily: "inherit",
                            }}
                        >
                            <PieChart size={15} /> {!movil && "Analizar"}
                        </button>

                        <button
                            onClick={() => setShowTxForm(v => !v)}
                            style={movil ? { ...botonPrimario(movil), padding: "8px 14px", fontSize: "0.8rem", minHeight: undefined, flexShrink: 0 } : botonPrimario(movil)}
                        >
                            <Plus size={16} /> Registrar
                        </button>
                    </div>
                );

                const tituloYSub = (
                    <div>
                        <h2 style={tituloPagina}>Finanzas</h2>
                        <p style={subtituloPagina}>
                            {VISTAS.find(v => v.id === vista)?.sub} · {periodLabel(topPeriod, new Date())}
                        </p>
                    </div>
                );

                // En móvil, el filtro de período + Registrar se separan del título y
                // quedan sticky por sí solos: adentro del `cabecera` (una caja de ~100px)
                // el sticky solo podía flotar esos 100px de scroll y luego se iba con
                // todo — como hijo directo del contenedor de la página (que sí mide
                // el alto completo) se queda a mano durante todo el scroll.
                if (movil) {
                    return (
                        <>
                            {tituloYSub}
                            <div style={{
                                // top se corre debajo de la barra fija superior (~37px); pegado
                                // en top:0 quedaba tapado por ella, que tiene mayor z-index.
                                position: "sticky", top: "37px", zIndex: 30,
                                background: C.surface, padding: "10px 0", margin: "-0.5rem 0 0",
                            }}>
                                {periodPillsAndRegistrar}
                            </div>
                        </>
                    );
                }

                return (
                    <div style={cabecera(movil)}>
                        {tituloYSub}
                        {periodPillsAndRegistrar}
                    </div>
                );
            })()}

            {/* Modal de alta, el mismo que usa Checklist: mismos campos, mismo aspecto */}
            <RegistroMovimiento
                open={showTxForm}
                onClose={() => setShowTxForm(false)}
                addTransaction={addTransaction}
                accounts={accounts}
                incomeCategories={incomeCategories}
                expenseCategories={expenseCategories}
            />

            {/* ── Mis Cuentas: vista directa y siempre visible de cuánto hay en cada
                cuenta (antes vivía oculta en un acordeón al fondo de la página) ─── */}
            <div style={{ ...CARD, padding: movil ? "1rem" : "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: movil ? "0.7rem" : "1rem", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <PiggyBank size={16} color={C.secondary} />
                        <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>Mis Cuentas</span>
                        <button
                            onClick={() => setIsAddingAccount(v => !v)}
                            title="Nueva cuenta"
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "center",
                                width: "20px", height: "20px", borderRadius: "50%",
                                border: `1.5px dashed ${C.outline}`, background: "transparent",
                                color: C.outline, cursor: "pointer", padding: 0,
                            }}
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                        <span style={{ fontSize: "0.65rem", color: C.onSurfaceVariant, fontWeight: 700 }}>Total:</span>
                        <span style={{ fontSize: "1rem", fontWeight: 900, color: C.secondary }}>
                            S/ {accountsWithBalance.reduce((s, a) => s + a.balance, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {isAddingAccount && (
                    <div style={{ borderRadius: movil ? "10px" : "14px", padding: movil ? "8px" : "12px", border: `1px solid ${C.secondary}`, background: C.surface, display: "flex", gap: "6px", alignItems: "center", marginBottom: movil ? "8px" : "12px" }}>
                        <input autoFocus placeholder="Nombre de la cuenta" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddAccount()} style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: "6px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.75rem", outline: "none" }} />
                        <input type="color" value={newAccountColor} onChange={e => setNewAccountColor(e.target.value)} style={{ width: "28px", height: "28px", borderRadius: "6px", border: `1px solid ${C.outlineVariant}`, padding: "1px", cursor: "pointer", flexShrink: 0 }} />
                        <button onClick={handleAddAccount} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "6px", padding: "6px 10px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>OK</button>
                        <button onClick={() => setIsAddingAccount(false)} style={{ background: C.outlineVariant, color: C.onSurfaceVariant, border: "none", borderRadius: "6px", padding: "6px 8px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>X</button>
                    </div>
                )}

                {accountsWithBalance.length === 0 ? (
                    <p style={{ fontSize: "0.8rem", color: C.outline, fontStyle: "italic", margin: 0 }}>Sin cuentas todavía. Toca el + para agregar una.</p>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: movil ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(150px,1fr))", gap: movil ? "8px" : "12px" }}>
                        {accountsWithBalance.map(acc => (
                            <button
                                key={acc.id}
                                onClick={() => setSelectedAccountId(acc.id)}
                                style={{
                                    background: C.surfaceLowest, borderRadius: movil ? "10px" : "14px", padding: movil ? "8px" : "14px", position: "relative",
                                    borderTop: `3px solid ${acc.color}`, minWidth: 0, overflow: "hidden", textAlign: "left", cursor: "pointer",
                                    borderLeft: `1px solid ${C.outlineVariant}`, borderRight: `1px solid ${C.outlineVariant}`, borderBottom: `1px solid ${C.outlineVariant}`,
                                    fontFamily: "inherit",
                                }}
                            >
                                <div style={{ fontSize: movil ? "0.62rem" : "0.7rem", color: C.onSurfaceVariant, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={acc.name}>
                                    {acc.name}
                                </div>
                                <div style={{ fontSize: movil ? "0.8rem" : "1.2rem", fontWeight: 900, marginTop: movil ? "3px" : "6px", color: C.onSurface, whiteSpace: "nowrap" }}>
                                    S/ {acc.balance.toLocaleString("en-US", { minimumFractionDigits: movil ? 0 : 2 })}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Selector de vista + Ver todo: en móvil las 3 vistas + el botón
                comparten una sola fila (antes "Ver todo" se iba a su propia fila
                al pedir 100% de ancho) ─── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: movil ? "6px" : "10px", flexWrap: movil ? "nowrap" : "wrap" }}>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: movil ? 1 : undefined, minWidth: 0 }}>
                    {VISTAS.map(v => {
                        const activo = vista === v.id;
                        return (
                            <button
                                key={v.id}
                                onClick={() => setVista(v.id)}
                                title={v.sub}
                                style={{
                                    border: activo ? "none" : `1px solid ${C.outlineVariant}`,
                                    borderRadius: "10px", cursor: "pointer",
                                    padding: movil ? "10px 6px" : "8px 16px",
                                    minHeight: movil ? `${TOQUE_MINIMO}px` : undefined,
                                    flex: movil ? 1 : undefined,
                                    minWidth: 0,
                                    fontSize: movil ? "0.7rem" : "0.82rem", fontWeight: 700,
                                    fontFamily: "inherit", transition: "all 0.15s",
                                    background: activo ? C.secondary : C.surfaceLowest,
                                    color: activo ? "#fff" : C.onSurfaceVariant,
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}
                            >
                                {v.label}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => setVerTodo(true)}
                    title="Ver todo junto"
                    style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                        background: "transparent", border: `1px solid ${C.outlineVariant}`,
                        borderRadius: "10px",
                        padding: movil ? "0" : "8px 14px",
                        width: movil ? `${TOQUE_MINIMO}px` : undefined,
                        minHeight: movil ? `${TOQUE_MINIMO}px` : undefined,
                        flexShrink: 0,
                        cursor: "pointer",
                        fontSize: "0.78rem", fontWeight: 700, color: C.secondary, fontFamily: "inherit",
                    }}
                >
                    <BarChart3 size={14} /> {!movil && "Ver todo junto"}
                </button>
            </div>

            {/* ── La vista activa ─── */}
            {vista === "real" && bloqueReal}
            {vista === "proyeccion" && bloqueProyeccion}
            {vista === "simulador" && bloqueSimulador}

            {/* ── Ver todo: las tres a pantalla completa ─── */}
            <AnimatePresence>
                {verTodo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setVerTodo(false)}
                        style={{
                            position: "fixed", inset: 0, zIndex: 9998,
                            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)",
                            overflowY: "auto", padding: "2rem 1rem",
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                maxWidth: "1100px", margin: "0 auto",
                                background: C.surface, borderRadius: "20px", padding: "1.5rem",
                                display: "flex", flexDirection: "column", gap: "1.25rem",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: C.onSurface }}>
                                        Las tres vistas
                                    </h3>
                                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: C.onSurfaceVariant, textTransform: "capitalize" }}>
                                        {periodLabel(topPeriod, new Date())}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setVerTodo(false)}
                                    style={{
                                        background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`,
                                        borderRadius: "10px", padding: "8px 12px", cursor: "pointer",
                                        display: "flex", alignItems: "center", gap: "6px",
                                        fontSize: "0.8rem", fontWeight: 700, color: C.onSurfaceVariant, fontFamily: "inherit",
                                    }}
                                >
                                    <X size={15} /> Cerrar
                                </button>
                            </div>

                            {bloqueReal}
                            {bloqueProyeccion}
                            {bloqueSimulador}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Row 4: Ingresos Fijos + Gastos Fijos ─── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>

                {/* Fixed incomes card */}
                <div style={{ ...cardConAcento(C.secondary), display: "flex", flexDirection: "column", gap: "0.6rem", minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={LABEL}>Ingresos Fijos</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.secondary }}>S/ {fixedIncomeTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            <Wallet size={14} color={C.secondary} />
                        </div>
                    </div>

                    {/* List of fixed incomes */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1, overflowY: "auto", maxHeight: "160px" }}>
                        {fixedIncomeItems.length === 0 && (
                            <p style={{ fontSize: "0.75rem", color: C.outline, margin: 0 }}>Sin ingresos fijos. Agrega uno abajo.</p>
                        )}
                        {fixedIncomeItems.map(item => {
                            const isReceived = item.lastReceivedMonth === currentMonthStr;
                            const isEditing = editingIncomeId === item.id;
                            return (
                                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: `1px solid ${C.surfaceContainerLow}`, opacity: item.active ? 1 : 0.45, transition: "opacity 0.15s" }}>
                                    {/* mini toggle */}
                                    <div onClick={() => toggleFixedIncome(item.id)} style={{ width: "28px", height: "16px", borderRadius: "8px", background: item.active ? C.secondary : C.outlineVariant, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", left: item.active ? "14px" : "2px", transition: "left 0.15s" }} />
                                    </div>
                                    {/* ok button to mark as received */}
                                    <button onClick={() => isReceived ? unmarkFixedIncomeReceived(item.id, currentMonthStr) : markFixedIncomeReceived(item.id, currentMonthStr)} style={{ background: isReceived ? C.verde : C.surfaceContainerLow, border: "none", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                                        <span style={{ color: isReceived ? "white" : C.outline, fontSize: "0.62rem", fontWeight: 900 }}>ok</span>
                                    </button>
                                    {isEditing ? (
                                        <>
                                            <input autoFocus value={editIncomeName} onChange={e => setEditIncomeName(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter") { updateFixedIncome(item.id, editIncomeName.trim(), parseFloat(editIncomeAmount) || 0); setEditingIncomeId(null); } if (e.key === "Escape") setEditingIncomeId(null); }}
                                                style={{ flex: 1, padding: "3px 6px", borderRadius: "5px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.78rem", outline: "none" }} />
                                            <div style={{ position: "relative", width: "70px" }}>
                                                <span style={{ position: "absolute", left: "4px", top: "50%", transform: "translateY(-50%)", fontSize: "0.62rem", fontWeight: 700, color: C.onSurfaceVariant }}>S/</span>
                                                <input type="number" value={editIncomeAmount} onChange={e => setEditIncomeAmount(e.target.value)}
                                                    onKeyDown={e => { if (e.key === "Enter") { updateFixedIncome(item.id, editIncomeName.trim(), parseFloat(editIncomeAmount) || 0); setEditingIncomeId(null); } if (e.key === "Escape") setEditingIncomeId(null); }}
                                                    style={{ width: "100%", padding: "3px 3px 3px 18px", borderRadius: "5px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.78rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                                            </div>
                                            <button onClick={() => { updateFixedIncome(item.id, editIncomeName.trim(), parseFloat(editIncomeAmount) || 0); setEditingIncomeId(null); }} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "4px", padding: "3px 5px", fontWeight: 800, fontSize: "0.6rem", cursor: "pointer" }}>OK</button>
                                            <button onClick={() => setEditingIncomeId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", display: "flex" }}><X size={11} /></button>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isReceived ? "line-through" : "none", color: isReceived ? C.outline : "var(--text-carbon)" }}>
                                                {item.name}
                                            </span>
                                            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: isReceived ? C.verde : (item.active ? C.secondary : C.outline) }}>
                                                S/ {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </span>
                                            <button onClick={() => { setEditingIncomeId(item.id); setEditIncomeName(item.name); setEditIncomeAmount(String(item.amount)); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", display: "flex" }}><Edit2 size={11} /></button>
                                            <button onClick={() => removeFixedIncome(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", display: "flex" }}><Trash2 size={11} /></button>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Add new income */}
                    {isAddingIncome ? (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <input autoFocus placeholder="Nombre" value={newIncomeName} onChange={e => setNewIncomeName(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && submitNewIncome()}
                                style={{ flex: 2, padding: "5px 8px", borderRadius: "7px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.78rem", outline: "none" }} />
                            <div style={{ position: "relative", flex: 1 }}>
                                <span style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "0.72rem", fontWeight: 700, color: C.onSurfaceVariant }}>S/</span>
                                <input type="number" placeholder="0" value={newIncomeAmount} onChange={e => setNewIncomeAmount(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && submitNewIncome()}
                                    style={{ width: "100%", padding: "5px 5px 5px 22px", borderRadius: "7px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.78rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                            </div>
                            <button onClick={submitNewIncome} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "6px", padding: "5px 8px", fontWeight: 800, fontSize: "0.65rem", cursor: "pointer" }}>OK</button>
                            <button onClick={() => setIsAddingIncome(false)} style={{ background: C.outlineVariant, border: "none", borderRadius: "6px", padding: "5px 7px", fontWeight: 800, fontSize: "0.65rem", cursor: "pointer" }}>X</button>
                        </motion.div>
                    ) : (
                        <button onClick={() => setIsAddingIncome(true)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
                            <Plus size={13} color={C.outline} /><span style={{ fontSize: "0.75rem", fontWeight: 600, color: C.outline }}>Nuevo ingreso fijo...</span>
                        </button>
                    )}
                </div>

                {/* Fixed expenses card */}
                <div style={{ ...cardConAcento(C.rojo), display: "flex", flexDirection: "column", gap: "0.6rem", minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={LABEL}>Gastos Fijos</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.rojo }}>Pendiente: S/ {totalFixedPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            <TrendingDown size={14} color={C.rojo} />
                        </div>
                    </div>

                    {/* List of fixed expenses */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1, overflowY: "auto", maxHeight: "160px" }}>
                        {fixedExpenses.length === 0 && (
                            <p style={{ fontSize: "0.75rem", color: C.outline, margin: 0 }}>Sin gastos fijos. Agrega uno abajo.</p>
                        )}
                        {fixedExpenses.map(exp => (
                            <FixedExpenseRow key={exp.id} expense={exp} toggleFixedExpense={toggleFixedExpense} removeFixedExpense={removeFixedExpense} updateFixedExpense={updateFixedExpense} markFixedExpensePaid={markFixedExpensePaid} unmarkFixedExpensePaid={unmarkFixedExpensePaid} isPaid={exp.lastPaidMonth === currentMonthStr} projects={projects} />
                        ))}
                    </div>

                    {/* Add new expense */}
                    <div style={{ marginTop: "0.2rem" }}>
                        <NewFixedExpenseForm addFixedExpense={addFixedExpense} projects={projects} />
                    </div>
                </div>

                {/* Debts card */}
                <div style={{ ...cardConAcento(C.secondary), display: "flex", flexDirection: "column", gap: "0.6rem", minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={LABEL}>Deudas</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.rojo }}>Debo: S/ {realOwe.toFixed(2)}</span>
                            <TrendingDown size={14} color={C.rojo} />
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1, overflowY: "auto", maxHeight: "160px" }}>
                        {activeDebtsAndCollections.filter(d => d.isOwe).length === 0 ? (
                            <p style={{ fontSize: "0.75rem", color: C.outline, margin: 0 }}>Sin deudas pendientes.</p>
                        ) : activeDebtsAndCollections.filter(d => d.isOwe).map(d => {
                            const dk = d.name + "::" + (d.contact || "");
                            const isActive = debtActiveMap[dk] ?? true;
                            const isPaying = payOpen[dk] ?? false;
                            return (
                            <div key={dk} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 0", borderBottom: `1px solid ${C.surfaceContainerLow}`, opacity: isActive ? 1 : 0.45 }}>
                                <div onClick={() => toggleDebtActive(dk)} style={{ width: "28px", height: "16px", borderRadius: "8px", background: isActive ? C.secondary : C.outlineVariant, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", left: isActive ? "14px" : "2px", transition: "left 0.15s" }} />
                                </div>
                                <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-carbon)" }}>
                                    {d.name}{d.contact ? ` (${d.contact})` : ""}
                                </span>
                                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: C.rojo }}>
                                    S/ {d.amount.toFixed(2)}
                                </span>
                                {isPaying ? (
                                    <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                                        <input type="number" value={payInputs[dk] ?? d.amount.toFixed(2)} onChange={e => setPayInputs(m => ({ ...m, [dk]: e.target.value }))}
                                            style={{ width: "55px", padding: "2px 4px", borderRadius: "4px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.65rem", fontWeight: 700, outline: "none" }} />
                                        <button onClick={() => handlePay(dk, parseFloat(payInputs[dk]) || 0, d)} style={{ background: C.verde, color: "white", border: "none", borderRadius: "4px", padding: "2px 5px", fontWeight: 800, fontSize: "0.6rem", cursor: "pointer" }}>Abonar</button>
                                        <button onClick={() => { setPayInputs(m => ({ ...m, [dk]: String(d.amount) })); handlePay(dk, d.amount, d); }} style={{ background: C.verde, color: "white", border: "none", borderRadius: "4px", padding: "2px 5px", fontWeight: 800, fontSize: "0.6rem", cursor: "pointer" }}>Todo</button>
                                        <button onClick={() => setPayOpen(m => ({ ...m, [dk]: false }))} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", fontSize: "0.7rem", fontWeight: 800 }}>X</button>
                                    </div>
                                ) : (
                                    <button onClick={() => { setPayInputs(m => ({ ...m, [dk]: String(d.amount) })); setPayOpen(m => ({ ...m, [dk]: true })); }} style={{ background: C.outlineVariant, border: "none", borderRadius: "4px", padding: "2px 6px", fontWeight: 700, fontSize: "0.6rem", cursor: "pointer", color: C.onSurfaceVariant, flexShrink: 0 }}>Abonar</button>
                                )}
                            </div>
                            );
                        })}
                    </div>
                    <div style={{ borderTop: `1px solid ${C.outlineVariant}`, paddingTop: "0.35rem", marginTop: "0.2rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.verde }}>Me deben: S/ {realOwed.toFixed(2)}</span>
                        {activeDebtsAndCollections.filter(d => !d.isOwe).length === 0 ? (
                            <p style={{ fontSize: "0.72rem", color: C.outline, margin: "4px 0 0 0" }}>Sin cobros pendientes.</p>
                        ) : activeDebtsAndCollections.filter(d => !d.isOwe).map(d => {
                            const dk = d.name + "::" + (d.contact || "");
                            const isActive = debtActiveMap[dk] ?? true;
                            const isPaying = payOpen[dk] ?? false;
                            return (
                                <div key={dk} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 0", opacity: isActive ? 1 : 0.45 }}>
                                    <div onClick={() => toggleDebtActive(dk)} style={{ width: "28px", height: "16px", borderRadius: "8px", background: isActive ? C.verde : C.outlineVariant, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", left: isActive ? "14px" : "2px", transition: "left 0.15s" }} />
                                    </div>
                                    <span style={{ flex: 1, fontSize: "0.78rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-carbon)" }}>
                                        {d.name}{d.contact ? ` (${d.contact})` : ""}
                                    </span>
                                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: C.verde }}>
                                        S/ {d.amount.toFixed(2)}
                                    </span>
                                    {isPaying ? (
                                        <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                                            <input type="number" value={payInputs[dk] ?? d.amount.toFixed(2)} onChange={e => setPayInputs(m => ({ ...m, [dk]: e.target.value }))}
                                                style={{ width: "55px", padding: "2px 4px", borderRadius: "4px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.65rem", fontWeight: 700, outline: "none" }} />
                                            <button onClick={() => handlePay(dk, parseFloat(payInputs[dk]) || 0, d)} style={{ background: C.verde, color: "white", border: "none", borderRadius: "4px", padding: "2px 5px", fontWeight: 800, fontSize: "0.6rem", cursor: "pointer" }}>Abonar</button>
                                            <button onClick={() => { setPayInputs(m => ({ ...m, [dk]: String(d.amount) })); handlePay(dk, d.amount, d); }} style={{ background: C.verde, color: "white", border: "none", borderRadius: "4px", padding: "2px 5px", fontWeight: 800, fontSize: "0.6rem", cursor: "pointer" }}>Todo</button>
                                            <button onClick={() => setPayOpen(m => ({ ...m, [dk]: false }))} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", fontSize: "0.7rem", fontWeight: 800 }}>X</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => { setPayInputs(m => ({ ...m, [dk]: String(d.amount) })); setPayOpen(m => ({ ...m, [dk]: true })); }} style={{ background: C.outlineVariant, border: "none", borderRadius: "4px", padding: "2px 6px", fontWeight: 700, fontSize: "0.6rem", cursor: "pointer", color: C.onSurfaceVariant, flexShrink: 0 }}>Abonar</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* ── Row 5: Chart + Debts ─── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>

                {/* Cash flow chart */}
                <div style={{ ...CARD, display: "flex", flexDirection: "column", minHeight: "240px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>Flujo de Caja</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <PillToggle options={["7d", "30d"]} value={chartPeriod} onChange={v => setChartPeriod(v as any)} />
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "6px" }}>
                        <LegendDot color={C.verde} label="Ingresos" />
                        <LegendDot color={C.rojo} label="Gastos" />
                    </div>
                    <div style={{ display: "flex", flex: 1, alignItems: "flex-end", gap: chartPeriod === "7d" ? "8px" : "3px", padding: "4px 0" }}>
                        {historyData.map((data, i) => {
                            const maxVal = Math.max(...historyData.map(h => Math.max(h.inc, h.exp)), 1);
                            const w = chartPeriod === "7d" ? "9px" : "4px";
                            return (
                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", height: "100%", justifyContent: "flex-end" }}>
                                    <div style={{ display: "flex", gap: "1px", alignItems: "flex-end", height: "100%", width: "100%", justifyContent: "center" }}>
                                        <motion.div initial={{ height: 0 }} animate={{ height: `${(data.inc / maxVal) * 100}%` }} transition={{ duration: 0.4 }} style={{ width: w, background: C.verde, borderRadius: "2px 2px 0 0", opacity: 0.85 }} />
                                        <motion.div initial={{ height: 0 }} animate={{ height: `${(data.exp / maxVal) * 100}%` }} transition={{ duration: 0.4 }} style={{ width: w, background: C.rojo, borderRadius: "2px 2px 0 0", opacity: 0.85 }} />
                                    </div>
                                    <span style={{ fontSize: "0.42rem", color: C.outline }}>{data.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Debts & collections */}
                <div 
                    onClick={() => onNavigate?.('Deudas')}
                    style={{ ...CARD, display: "flex", flexDirection: "column", minHeight: "240px", cursor: "pointer" }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>Deudas y Cobros</span>
                        <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={(e) => { e.stopPropagation(); onNavigate?.('Deudas'); }} style={{ background: "rgba(239,68,68,0.08)", border: "none", color: C.rojo, fontSize: "0.7rem", fontWeight: 800, cursor: "pointer", padding: "3px 10px", borderRadius: "8px" }}>Debo</button>
                            <button onClick={(e) => { e.stopPropagation(); onNavigate?.('Deudas'); }} style={{ background: "rgba(16,185,129,0.08)", border: "none", color: C.verde, fontSize: "0.7rem", fontWeight: 800, cursor: "pointer", padding: "3px 10px", borderRadius: "8px" }}>Me Deben</button>
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, overflowY: "auto" }}>
                        {activeDebtsAndCollections.length === 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "6px", color: C.outlineVariant }}>
                                <Check size={26} strokeWidth={1.5} />
                                <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Sin deudas activas</span>
                            </div>
                        ) : activeDebtsAndCollections.map((debt, i) => (
                            <div key={i} onClick={(e) => { e.stopPropagation(); onNavigate?.('Deudas'); }}
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: "12px", background: C.surface, border: `1px solid ${C.surfaceContainerLow}`, cursor: "pointer" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: debt.isOwe ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: debt.isOwe ? C.rojo : C.verde, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        {debt.isOwe ? <UserMinus size={14} /> : <UserPlus size={14} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>{debt.name}</div>
                                        {debt.contact && <div style={{ fontSize: "0.62rem", color: C.outline }}>{debt.contact}</div>}
                                    </div>
                                </div>
                                <span style={{ fontWeight: 800, fontSize: "0.88rem", color: debt.isOwe ? C.rojo : C.verde }}>{debt.isOwe ? "-" : "+"}S/ {debt.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                    </div>
                    {/* Footer with CORRECTED totals */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: `1px solid ${C.surfaceContainerLow}` }}>
                        <span style={{ fontSize: "0.72rem", color: C.rojo, fontWeight: 700 }}>Debo: S/ {realOwe.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        <span style={{ fontSize: "0.72rem", color: C.verde, fontWeight: 700 }}>Me deben: S/ {realOwed.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

            </div>

            {/* ── Categories accordion ─── */}
            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
                <button onClick={() => setIsCategoriesVisible(v => !v)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface, border: "none", padding: "15px 20px", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Tag size={17} color={C.secondary} />
                        <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>Categorías</span>
                    </div>
                    <motion.div animate={{ rotate: isCategoriesVisible ? 180 : 0 }}><ArrowDownCircle size={15} /></motion.div>
                </button>
                <AnimatePresence>
                    {isCategoriesVisible && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
                            <div style={{ padding: "16px 20px" }}>
                                <div style={{ marginBottom: "14px" }}>
                                    <PillToggle
                                        options={["gasto", "ingreso"]}
                                        labels={["Gasto", "Ingreso"]}
                                        value={categoryTab}
                                        onChange={(v) => setCategoryTab(v as "gasto" | "ingreso")}
                                    />
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
                                    {(() => {
                                        const currentCategories = (categoryTab === "gasto" ? expenseCategories : incomeCategories) || [];
                                        const menuItemStyle: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, color: C.onSurface, textAlign: "left", fontFamily: "inherit" };
                                        return currentCategories.map(cat => {
                                            const isRenaming = renamingCategory === cat;
                                            const isMenuOpen = activeMenuCategory === cat;
                                            const otherCategories = currentCategories.filter(c => c !== cat);
                                            return (
                                                <div key={cat} style={{
                                                    display: "flex", alignItems: "center", gap: "4px",
                                                    background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`,
                                                    borderRadius: "999px", padding: isRenaming ? "4px 8px" : "6px 4px 6px 12px",
                                                }}>
                                                    {isRenaming ? (
                                                        <input
                                                            autoFocus
                                                            value={renameDraft}
                                                            onChange={e => setRenameDraft(e.target.value)}
                                                            onKeyDown={e => { if (e.key === "Enter") saveRenameCategory(); if (e.key === "Escape") setRenamingCategory(null); }}
                                                            onBlur={saveRenameCategory}
                                                            style={{ fontSize: "0.78rem", fontWeight: 700, color: C.onSurfaceVariant, border: "none", borderBottom: `2px solid ${C.secondary}`, outline: "none", padding: "2px 0", width: `${Math.max(renameDraft.length, 4)}ch`, fontFamily: "inherit", background: "transparent" }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: C.onSurfaceVariant }}>{cat}</span>
                                                    )}
                                                    {!isRenaming && (renameCategory || removeCategory || mergeCategory) && (
                                                        <div style={{ position: "relative" }}>
                                                            <button
                                                                onClick={() => { setActiveMenuCategory(isMenuOpen ? null : cat); setCategoryMenuMode("root"); }}
                                                                style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, display: "flex", padding: "4px" }}
                                                            >
                                                                <MoreVertical size={14} />
                                                            </button>
                                                            <AnimatePresence>
                                                                {isMenuOpen && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                                                        style={{ position: "absolute", top: "26px", right: 0, background: "white", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: `1px solid ${C.outlineVariant}`, overflow: "hidden", zIndex: 20, minWidth: "170px" }}
                                                                    >
                                                                        {categoryMenuMode === "root" ? (
                                                                            <>
                                                                                {renameCategory && (
                                                                                    <button onClick={() => startRenameCategory(cat)} style={menuItemStyle}>
                                                                                        <Edit2 size={13} /> Renombrar
                                                                                    </button>
                                                                                )}
                                                                                {mergeCategory && otherCategories.length > 0 && (
                                                                                    <button onClick={() => setCategoryMenuMode("merge")} style={menuItemStyle}>
                                                                                        <Merge size={13} /> Fusionar con...
                                                                                    </button>
                                                                                )}
                                                                                {removeCategory && (
                                                                                    <button onClick={() => { setConfirmDeleteCategory(cat); closeCategoryMenu(); }} style={{ ...menuItemStyle, color: C.rojo, borderTop: `1px solid ${C.outlineVariant}` }}>
                                                                                        <Trash2 size={13} /> Eliminar
                                                                                    </button>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                                                                                {otherCategories.map(other => (
                                                                                    <button key={other} onClick={() => handleMergeCategory(cat, other)} style={menuItemStyle}>
                                                                                        {other}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                    {(categoryTab === "gasto" ? expenseCategories : incomeCategories)?.length === 0 && (
                                        <p style={{ fontSize: "0.78rem", color: C.outline, fontStyle: "italic", margin: 0 }}>
                                            Sin categorías de {categoryTab}.
                                        </p>
                                    )}
                                </div>
                                <ConfirmDialog
                                    open={!!confirmDeleteCategory}
                                    title="Eliminar categoría"
                                    message={`¿Eliminar la categoría "${confirmDeleteCategory}"? Los movimientos ya registrados con esta categoría no cambiarán.`}
                                    confirmLabel="Eliminar"
                                    cancelLabel="Cancelar"
                                    onConfirm={handleConfirmDeleteCategory}
                                    onCancel={() => setConfirmDeleteCategory(null)}
                                />
                                {addCategory && (
                                    <div style={{ display: "flex", gap: "6px" }}>
                                        <input
                                            placeholder="Nueva categoría..."
                                            value={newCategoryName}
                                            onChange={e => setNewCategoryName(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && handleAddCategory()}
                                            style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.82rem", outline: "none" }}
                                        />
                                        <button onClick={handleAddCategory} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "8px", padding: "0 16px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center" }}>
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Modals ─── */}
            <AnimatePresence>
                {selectedProject && <ProjectDetailView project={selectedProject} onClose={() => setSelectedProject(null)} accounts={accounts} setAccounts={setAccounts} transactions={transactions} addProjectTask={addProjectTask} toggleProjectTask={toggleProjectTask} removeProjectTask={removeProjectTask} updateProjectTask={updateProjectTask} reorderProjectTasks={reorderProjectTasks} promoteTaskToRoutine={promoteTaskToRoutine} rutinas={rutinas} addProjectCategory={addProjectCategory} removeProjectCategory={removeProjectCategory} addInventoryItem={addInventoryItem} updateInventoryItemQuantity={updateInventoryItemQuantity} removeInventoryItem={removeInventoryItem} projects={projects} updateProject={updateProject} />}
            </AnimatePresence>
            <AnimatePresence>
                {showAnalytics && <AnalyticsView transactions={transactions} onClose={() => setShowAnalytics(false)} owe={realOwe} owed={realOwed} accounts={accounts} />}
            </AnimatePresence>
            <AnimatePresence>
                {selectedAccountId != null && accountsWithBalance.find(a => a.id === selectedAccountId) && (
                    <AccountDetailModal
                        account={accountsWithBalance.find(a => a.id === selectedAccountId)!}
                        transactions={transactions}
                        projects={projects}
                        onClose={() => setSelectedAccountId(null)}
                        onRename={(name) => setAccounts(prev => prev.map(a => a.id === selectedAccountId ? { ...a, name } : a))}
                        onChangeColor={(color) => setAccounts(prev => prev.map(a => a.id === selectedAccountId ? { ...a, color } : a))}
                        onDelete={() => {
                            if (window.confirm("¿Eliminar esta cuenta?")) {
                                setAccounts(prev => prev.filter(a => a.id !== selectedAccountId));
                                setSelectedAccountId(null);
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// ─── Shared micro-components ──────────────────────────────────────────────────
const LegendDot = ({ color, label }: { color: string; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
        <span style={{ fontSize: "0.58rem", color: C.onSurfaceVariant }}>{label}</span>
    </div>
);

export const PillToggle = ({ options, labels, value, onChange }: { options: string[]; labels?: string[]; value: string; onChange: (v: string) => void }) => (
    <div style={{ display: "flex", background: C.surfaceContainerLow, padding: "2px", borderRadius: "10px", gap: "2px" }}>
        {options.map((o, i) => (
            <button key={o} onClick={() => onChange(o)} style={{ padding: "3px 8px", borderRadius: "8px", border: "none", background: value === o ? "white" : "transparent", color: value === o ? C.secondary : C.onSurfaceVariant, fontSize: "0.62rem", fontWeight: 800, cursor: "pointer", boxShadow: value === o ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                {labels ? labels[i] : o.toUpperCase()}
            </button>
        ))}
    </div>
);

// ─── Fixed expense row ────────────────────────────────────────────────────────
const FixedExpenseRow = ({ expense, toggleFixedExpense, removeFixedExpense, updateFixedExpense, markFixedExpensePaid, unmarkFixedExpensePaid, isPaid }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(expense.text);
    const [editAmount, setEditAmount] = useState(String(expense.amount));
    const monthStr = new Date().toLocaleDateString("en-CA").substring(0, 7);

    if (isEditing) return (
        <div style={{ display: "flex", gap: "7px", marginBottom: "7px", alignItems: "center", padding: "8px", background: C.surface, borderRadius: "10px", border: `1px solid ${C.outlineVariant}` }}>
            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 2, padding: "5px 8px", borderRadius: "7px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.82rem", outline: "none" }} />
            <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={{ flex: 1, padding: "5px 8px", borderRadius: "7px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.82rem", outline: "none" }} />
            <button onClick={() => { updateFixedExpense(expense.id, { text: editName, amount: Number(editAmount) }); setIsEditing(false); }} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "7px", padding: "5px 10px", fontWeight: 800, cursor: "pointer" }}>OK</button>
            <button onClick={() => setIsEditing(false)} style={{ background: C.outlineVariant, border: "none", borderRadius: "7px", padding: "5px 8px", fontWeight: 800, cursor: "pointer" }}>X</button>
        </div>
    );

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: `1px solid ${C.surfaceContainerLow}` }}>
            <div onClick={() => toggleFixedExpense(expense.id)} style={{ width: "30px", height: "17px", borderRadius: "9px", background: expense.active ? C.secondary : C.outlineVariant, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                <div style={{ width: "13px", height: "13px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", left: expense.active ? "15px" : "2px", transition: "left 0.15s" }} />
            </div>
            <button onClick={() => isPaid ? unmarkFixedExpensePaid(expense.id, monthStr) : markFixedExpensePaid(expense.id, monthStr)} style={{ background: isPaid ? C.verde : C.surfaceContainerLow, border: "none", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <span style={{ color: isPaid ? "white" : C.outline, fontSize: "0.62rem", fontWeight: 900 }}>ok</span>
            </button>
            <span style={{ textDecoration: isPaid ? "line-through" : "none", fontWeight: 600, flex: 1, fontSize: "0.83rem", color: isPaid ? C.outline : "var(--text-carbon)", opacity: expense.active ? 1 : 0.45 }}>
                {expense.text}
                {expense.dueDay && <span style={{ fontSize: "0.6rem", color: C.outline, marginLeft: "5px" }}>dia {expense.dueDay}</span>}
            </span>
            <span style={{ fontWeight: 800, fontSize: "0.88rem", opacity: expense.active ? 1 : 0.45, color: isPaid ? C.verde : "var(--text-carbon)" }}>S/ {expense.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            <button onClick={() => setIsEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "3px", display: "flex" }}><Edit2 size={12} /></button>
            <button onClick={() => removeFixedExpense(expense.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "3px", display: "flex" }}><Trash2 size={12} /></button>
        </div>
    );
};

// ─── New fixed expense form ───────────────────────────────────────────────────
const NewFixedExpenseForm = ({ addFixedExpense, projects }: any) => {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDay, setDueDay] = useState<number | undefined>(undefined);
    const [projectId, setProjectId] = useState<number | undefined>(undefined);
    const [open, setOpen] = useState(false);

    const submit = () => {
        if (name && amount) {
            addFixedExpense(name, parseFloat(amount), projectId, dueDay);
            setName(""); setAmount(""); setProjectId(undefined); setDueDay(undefined); setOpen(false);
        }
    };

    if (!open) return (
        <button onClick={() => setOpen(true)} style={{ display: "flex", alignItems: "center", gap: "7px", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
            <Plus size={13} color={C.outline} /><span style={{ fontSize: "0.78rem", fontWeight: 600, color: C.outline }}>Nuevo gasto fijo...</span>
        </button>
    );

    return (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: "6px", background: C.surface, padding: "10px", borderRadius: "12px", border: `1px solid ${C.outlineVariant}` }}>
            <div style={{ display: "flex", gap: "6px" }}>
                <input autoFocus placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={{ flex: 2, padding: "6px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.8rem", outline: "none" }} />
                <input type="number" placeholder="S/ " value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={{ flex: 1, padding: "6px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.8rem", outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {projects.length > 0 && <select value={projectId || ""} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : undefined)} style={{ flex: 1, padding: "4px", borderRadius: "6px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.7rem", fontWeight: 700, background: "white", outline: "none" }}><option value="">Proyecto?</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
                <input type="number" placeholder="Dia" value={dueDay || ""} onChange={e => setDueDay(e.target.value ? Number(e.target.value) : undefined)} min="1" max="31" style={{ width: "44px", padding: "4px", borderRadius: "6px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.7rem", fontWeight: 800, background: C.surfaceContainerLow, textAlign: "center", outline: "none" }} />
                <button onClick={() => setOpen(false)} style={{ padding: "4px 8px", borderRadius: "6px", border: "none", background: C.outlineVariant, color: C.onSurfaceVariant, fontSize: "0.65rem", fontWeight: 800, cursor: "pointer" }}>X</button>
                <button onClick={submit} style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: C.secondary, color: "white", fontSize: "0.65rem", fontWeight: 800, cursor: "pointer" }}>OK</button>
            </div>
        </motion.div>
    );
};

