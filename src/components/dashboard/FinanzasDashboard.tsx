import { useState, useMemo } from "react";
import {
    Wallet, Plus, TrendingUp, TrendingDown,
    Trash2, Edit2, PieChart, X,
    UserMinus, UserPlus, Check, PiggyBank, ArrowDownCircle, DollarSign,
    ChevronLeft, ChevronRight, Calendar, BarChart3
} from "lucide-react";
import { AnalyticsView } from "./AnalyticsView";
import { motion, AnimatePresence } from "framer-motion";
import { ProjectDetailView } from "./ProjectDetailView";
import { DebtDetailView } from "./DebtDetailView";
import type { Transaction, FixedExpense, Project, Routine, UserPreferences } from "../../hooks/useAlDiaState";

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
}

type PeriodMode = "day" | "week" | "month" | "year" | "all";
type TxFilter = "all" | "ingreso" | "gasto";

const CARD: React.CSSProperties = {
    background: "#FFFFFF",
    borderRadius: "16px",
    padding: "1.5rem",
    border: "1px solid #E2E8F0",
    boxShadow: "0px 4px 12px rgba(15,23,42,0.04)",
};
const LABEL: React.CSSProperties = {
    fontSize: "0.68rem",
    fontWeight: 800,
    color: "#64748B",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
};

const CircleCheckbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            border: `1.5px solid ${checked ? "var(--domain-blue)" : "#94A3B8"}`,
            background: checked ? "var(--domain-blue)" : "transparent",
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

// ---------- helpers ----------
function getPeriodBounds(mode: PeriodMode, ref: Date): { start: string; end: string } {
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

function periodLabel(mode: PeriodMode, ref: Date): string {
    if (mode === "all") return "Todo el historial";
    if (mode === "day") return ref.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    if (mode === "week") {
        const { start, end } = getPeriodBounds("week", ref);
        return `${start.slice(5)} → ${end.slice(5)}`;
    }
    if (mode === "month") return ref.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    return String(ref.getFullYear());
}

function shiftPeriod(mode: PeriodMode, ref: Date, dir: -1 | 1): Date {
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
    repayDebt, removeTransaction, updateTransactionGroup, addTransaction,
    projects, accounts, setAccounts,
    addProjectTask, toggleProjectTask, removeProjectTask, updateProjectTask,
    reorderProjectTasks, promoteTaskToRoutine, rutinas,
    addProjectCategory, removeProjectCategory,
    addInventoryItem, updateInventoryItemQuantity, removeInventoryItem,
    updateProject,
    preferences, updatePreference
}: FinanzasProps) => {
    const currentMonthStr = useMemo(() => new Date().toLocaleDateString("en-CA").substring(0, 7), []);

    // ── Config ────────────────────────────────────────────────────────────
    const [includeDebts, setIncludeDebts] = useState(false);
    const [includeFixed, setIncludeFixed] = useState(true);
    const [includeOwed, setIncludeOwed] = useState(false);
    const [includeBalance, setIncludeBalance] = useState(true);
    const [includeSalary, setIncludeSalary] = useState(true);
    const [topPeriod, setTopPeriod] = useState<PeriodMode>("month");

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
                const isOwe = (tx.type === "gasto" && tx.isCashless) || (tx.type === "ingreso" && !tx.isCashless);
                groups[key] = { total: 0, originalTx: tx, isOwe: isPayment ? tx.type === "gasto" : isOwe };
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

    const projectedResources = (includeBalance ? periodBalance : 0) + (includeSalary ? fixedIncomeTotal * periodMultiplier : 0) + (includeOwed ? realOwed : 0);
    const projectedExpenses = (includeFixed ? projectedFixedVal : 0) + (includeDebts ? realOwe : 0);
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
        const res = (includeBalance ? periodBalance : 0) + (includeSalary ? projectedIncomeVal : 0) + (includeOwed ? realOwed : 0);
        const exp = (includeFixed ? projectedFixedVal : 0) + (includeDebts ? realOwe : 0);
        return res - exp;
    }, [includeBalance, periodBalance, includeSalary, projectedIncomeVal, includeOwed, realOwed, includeFixed, projectedFixedVal, includeDebts, realOwe]);

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

    const variableExpenseProyectado = useMemo(() => topExpense - fixedExpenseProyectado, [topExpense, fixedExpenseProyectado]);

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
    const [isAccountsVisible, setIsAccountsVisible] = useState(false);
    const [showDebtDetail, setShowDebtDetail] = useState(false);
    const [debtMode, setDebtMode] = useState<"owe" | "owed">("owe");
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [chartPeriod, setChartPeriod] = useState<"7d" | "30d">("7d");

    // ── Period (Historial) state ───────────────────────────────────────────
    const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
    const [periodRef, setPeriodRef] = useState<Date>(new Date());
    const [txFilter, setTxFilter] = useState<TxFilter>("all");

    const { start: pStart, end: pEnd } = useMemo(() => getPeriodBounds(periodMode, periodRef), [periodMode, periodRef]);

    const periodTxs = useMemo(() =>
        transactions.filter(tx => !tx.isDebt && tx.fullDate >= pStart && tx.fullDate <= pEnd),
        [transactions, pStart, pEnd]);

    const periodStats = useMemo(() => {
        const income = periodTxs.filter(t => t.type === "ingreso").reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const expense = periodTxs.filter(t => t.type === "gasto").reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
        return { income, expense, net: income - expense };
    }, [periodTxs]);

    const filteredTxs = useMemo(() =>
        txFilter === "all" ? periodTxs : periodTxs.filter(t => t.type === txFilter),
        [periodTxs, txFilter]);

    // ── Accounts ──────────────────────────────────────────────────────────
    const accountsWithBalance = useMemo(() =>
        accounts.map(acc => ({
            ...acc,
            balance: transactions.filter(tx => tx.accountId === acc.id && !tx.isCashless).reduce((s, tx) => s + (Number(tx.amount) || 0), 0)
        })), [accounts, transactions]);

    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [newAccountName, setNewAccountName] = useState("");
    const [newAccountColor, setNewAccountColor] = useState("#0055FF");

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
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingBottom: "5rem", color: "var(--text-carbon)" }}>

            {/* ── Row 1: Situación Financiera Real ─── */}
            <div style={{ ...CARD, borderLeft: "4px solid #059669" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem", flexWrap: "wrap", gap: "8px" }}>
                    <span style={LABEL}>Situación Financiera Real</span>
                    <TrendingUp size={16} color="#059669" />
                </div>
                <span style={{ fontSize: "0.65rem", color: "#94A3B8", marginBottom: "0.8rem", display: "block" }}>Ingresos y gastos reales + deudas y patrimonio — lo que ya pasó</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "0.75rem", flex: 1, alignItems: "center" }}>
                    {[
                        { label: topPeriodDetails.label, val: topIncome, color: "#10B981", sub: topPeriodDetails.sub },
                        { label: "Fijo", val: fixedIncomeActual, color: "#10B981", sub: "Activos recibidos" },
                        { label: "Variable", val: variableIncomeActual, color: "#10B981", sub: "Ingresos directos" },
                        { label: topPeriodDetails.labelExp, val: topExpense, color: "#EF4444", sub: topPeriodDetails.subExp },
                        { label: "Fijo", val: fixedExpenseActual, color: "#EF4444", sub: "Gastos activos" },
                        { label: "Variable", val: variableExpenseActual, color: "#EF4444", sub: "Gastos directos" },
                        { label: "Balance Neto", val: topIncome - topExpense, color: (topIncome - topExpense) >= 0 ? "#10B981" : "#EF4444", sub: "Ingresos - Gastos" },
                        { label: "Debo", val: realOwe, color: "#EF4444", sub: realOwe > 0 ? "Deudas pendientes" : "Sin deudas" },
                        { label: "Me Deben", val: realOwed, color: "#10B981", sub: realOwed > 0 ? "Por cobrar" : "Sin cobros" },
                        { label: "Patrimonio Neto", val: periodBalance - realOwe + realOwed, color: (periodBalance - realOwe + realOwed) >= 0 ? "var(--domain-blue)" : "#EF4444", sub: "Balance - Deudas + Cobros" },
                    ].map((item, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: i > 0 ? "0.75rem" : "0", borderLeft: i > 0 ? "1px solid #E2E8F0" : "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.3rem" }}>
                                <span style={{ ...LABEL }}>{item.label}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "1px", color: item.color }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>S/ </span>
                                <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1 }}>{item.val.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <span style={{ fontSize: "0.58rem", color: "#94A3B8", marginTop: "2px" }}>{item.sub}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Row 2: Proyección Financiera ─── */}
            <div style={{ ...CARD, borderLeft: "4px solid #F59E0B", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem", flexWrap: "wrap", gap: "8px" }}>
                    <span style={LABEL}>Proyección Financiera</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <PillToggle
                            options={["day", "week", "month", "year", "all"]}
                            labels={["Día", "Sem.", "Mes", "Año", "Todo"]}
                            value={topPeriod}
                            onChange={v => setTopPeriod(v as any)}
                        />
                        <TrendingUp size={16} color="#10B981" style={{ marginLeft: "4px" }} />
                    </div>
                </div>
                <span style={{ fontSize: "0.65rem", color: "#94A3B8", marginBottom: "0.8rem", display: "block" }}>Ingresos/gastos fijos proyectados + variables reales — lo que debería pasar</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "0.75rem", flex: 1, alignItems: "center" }}>
                    {[
                        { label: "Ingresos Proy.", val: projectedIncomeTotal, color: "#10B981", sub: "Fijos + Variables" },
                        { label: "Fijo", val: fixedIncomeTotal * periodMultiplier, color: "#10B981", sub: "Activos proyectados" },
                        { label: "Variable", val: variableIncomeActual, color: "#10B981", sub: "Ingresos directos" },
                        { label: "Gastos Proy.", val: projectedExpenseTotal, color: "#EF4444", sub: "Fijos + Variables" },
                        { label: "Fijo", val: fixedExpenseProyectado, color: "#EF4444", sub: "Gastos activos" },
                        { label: "Variable", val: variableExpenseActual, color: "#EF4444", sub: "Gastos directos" },
                        { 
                            label: "Debo", 
                            val: realOwe, 
                            color: includeDebts ? "#EF4444" : "#94A3B8", 
                            sub: includeDebts ? "Debo (incluido)" : "Debo (excluido)", 
                            checked: includeDebts,
                            onToggle: () => setIncludeDebts(v => !v),
                            opacity: includeDebts ? 1 : 0.65 
                        },
                        { 
                            label: "Me Deben", 
                            val: realOwed, 
                            color: includeOwed ? "#10B981" : "#94A3B8", 
                            sub: includeOwed ? "Cobros incluidos" : "Cobros excluidos",
                            checked: includeOwed,
                            onToggle: () => setIncludeOwed(v => !v),
                            opacity: includeOwed ? 1 : 0.65
                        },
                        { 
                            label: "Balance Neto Proyectado", 
                            val: projectedSavings, 
                            color: projectedSavings >= 0 ? "var(--domain-blue)" : "#EF4444", 
                            sub: projectedPeriodLabel 
                        },
                    ].map((item, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: i > 0 ? "0.75rem" : "0", borderLeft: i > 0 ? "1px solid #E2E8F0" : "none", opacity: item.opacity ?? 1, transition: "opacity 0.2s" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.3rem" }}>
                                {item.onToggle && (
                                    <CircleCheckbox checked={item.checked ?? false} onChange={item.onToggle} />
                                )}
                                <span style={{ ...LABEL }}>{item.label}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "1px", color: item.color }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>S/ </span>
                                <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1 }}>{item.val.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <span style={{ fontSize: "0.58rem", color: "#94A3B8", marginTop: "2px" }}>{item.sub}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Row 3: Ejecución y Proyección Ajustada ─── */}
            <div style={{ ...CARD, borderLeft: "4px solid #8B5CF6", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem", flexWrap: "wrap", gap: "8px" }}>
                    <span style={LABEL}>Ejecución y Proyección Ajustada</span>
                    <TrendingUp size={16} color="#8B5CF6" style={{ marginLeft: "4px" }} />
                </div>
                <span style={{ fontSize: "0.65rem", color: "#94A3B8", marginBottom: "0.8rem", display: "block" }}>Mix ajustable con toggles — incluí/excluí fijos, deudas y cobros</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "0.75rem", flex: 1, alignItems: "center" }}>
                    {[
                        { label: topPeriodDetails.label, val: topIncome, color: "#10B981", sub: topPeriodDetails.sub },
                        { label: topPeriodDetails.labelExp, val: topExpense, color: "#EF4444", sub: topPeriodDetails.subExp },
                        {
                            label: "Saldo Actual",
                            val: periodBalance,
                            color: includeBalance ? "#10B981" : "#94A3B8",
                            sub: includeBalance ? "Disponible" : "Excluido",
                            checked: includeBalance,
                            onToggle: () => setIncludeBalance(v => !v),
                            opacity: includeBalance ? 1 : 0.65
                        },
                        {
                            label: "Ingreso Fijo",
                            val: projectedIncomeVal,
                            color: (fixedIncomeTotal > 0) ? (includeSalary ? "#10B981" : "#94A3B8") : "#94A3B8",
                            sub: fixedIncomeTotal > 0 
                                ? (includeSalary 
                                    ? (topPeriod === "month" || topPeriod === "all"
                                        ? `Pendiente: S/ ${projectedIncomeVal.toFixed(0)} / Total: S/ ${fixedIncomeTotal.toFixed(0)}`
                                        : "Fijos proyectados")
                                    : "Fijos excluidos") 
                                : "Sin ingresos fijos",
                            checked: fixedIncomeTotal > 0 ? includeSalary : false,
                            onToggle: fixedIncomeTotal > 0 ? (() => setIncludeSalary(v => !v)) : undefined,
                            opacity: fixedIncomeTotal === 0 ? 0.5 : (includeSalary ? 1 : 0.65)
                        },
                        {
                            label: "Ingresos Proy.",
                            val: periodBalance + (includeSalary ? projectedIncomeVal : 0),
                            color: (periodBalance + (includeSalary ? projectedIncomeVal : 0)) >= 0 ? "#10B981" : "#EF4444",
                            sub: "Neto + proyectado"
                        },
                        { 
                            label: "Gastos Fijos", 
                            val: projectedFixedVal, 
                            color: includeFixed ? "#EF4444" : "#94A3B8", 
                            sub: includeFixed 
                                ? (topPeriod === "month" || topPeriod === "all" 
                                    ? `Pendiente: S/ ${projectedFixedVal.toFixed(0)} / Total: S/ ${monthlyFixedTotal.toFixed(0)}`
                                    : "Fijos proyectados")
                                : "Fijos excluidos",
                            checked: includeFixed,
                            onToggle: () => setIncludeFixed(v => !v),
                            opacity: includeFixed ? 1 : 0.65
                        },
                        { 
                            label: "Debo", 
                            val: realOwe, 
                            color: includeDebts ? "#EF4444" : "#94A3B8", 
                            sub: includeDebts ? "Debo (incluido)" : "Debo (excluido)", 
                            checked: includeDebts,
                            onToggle: () => setIncludeDebts(v => !v),
                            opacity: includeDebts ? 1 : 0.65 
                        },
                        { 
                            label: "Me Deben", 
                            val: realOwed, 
                            color: includeOwed ? "#10B981" : "#94A3B8", 
                            sub: includeOwed ? "Cobros incluidos" : "Cobros excluidos",
                            checked: includeOwed,
                            onToggle: () => setIncludeOwed(v => !v),
                            opacity: includeOwed ? 1 : 0.65
                        },
                        { 
                            label: "Balance Neto", 
                            val: adjustedSavings, 
                            color: adjustedSavings >= 0 ? "var(--domain-blue)" : "#EF4444", 
                            sub: projectedPeriodLabel 
                        },
                    ].map((item, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: i > 0 ? "0.75rem" : "0", borderLeft: i > 0 ? "1px solid #E2E8F0" : "none", opacity: item.opacity ?? 1, transition: "opacity 0.2s" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.3rem" }}>
                                {item.onToggle && (
                                    <CircleCheckbox checked={item.checked ?? false} onChange={item.onToggle} />
                                )}
                                <span style={{ ...LABEL }}>{item.label}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "1px", color: item.color }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>S/ </span>
                                <span style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1 }}>{item.val.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <span style={{ fontSize: "0.58rem", color: "#94A3B8", marginTop: "2px" }}>{item.sub}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Row 4: Ingresos Fijos + Gastos Fijos ─── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>

                {/* Fixed incomes card */}
                <div style={{ ...CARD, borderLeft: "4px solid var(--domain-blue)", display: "flex", flexDirection: "column", gap: "0.6rem", minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={LABEL}>Ingresos Fijos</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--domain-blue)" }}>S/ {fixedIncomeTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            <Wallet size={14} color="var(--domain-blue)" />
                        </div>
                    </div>

                    {/* List of fixed incomes */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1, overflowY: "auto", maxHeight: "160px" }}>
                        {fixedIncomeItems.length === 0 && (
                            <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: 0 }}>Sin ingresos fijos. Agrega uno abajo.</p>
                        )}
                        {fixedIncomeItems.map(item => {
                            const isReceived = item.lastReceivedMonth === currentMonthStr;
                            const isEditing = editingIncomeId === item.id;
                            return (
                                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid #F1F5F9", opacity: item.active ? 1 : 0.45, transition: "opacity 0.15s" }}>
                                    {/* mini toggle */}
                                    <div onClick={() => toggleFixedIncome(item.id)} style={{ width: "28px", height: "16px", borderRadius: "8px", background: item.active ? "var(--domain-blue)" : "#CBD5E1", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", left: item.active ? "14px" : "2px", transition: "left 0.15s" }} />
                                    </div>
                                    {/* ok button to mark as received */}
                                    <button onClick={() => isReceived ? unmarkFixedIncomeReceived(item.id, currentMonthStr) : markFixedIncomeReceived(item.id, currentMonthStr)} style={{ background: isReceived ? "#10B981" : "#F1F5F9", border: "none", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                                        <span style={{ color: isReceived ? "white" : "#94A3B8", fontSize: "0.62rem", fontWeight: 900 }}>ok</span>
                                    </button>
                                    {isEditing ? (
                                        <>
                                            <input autoFocus value={editIncomeName} onChange={e => setEditIncomeName(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter") { updateFixedIncome(item.id, editIncomeName.trim(), parseFloat(editIncomeAmount) || 0); setEditingIncomeId(null); } if (e.key === "Escape") setEditingIncomeId(null); }}
                                                style={{ flex: 1, padding: "3px 6px", borderRadius: "5px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                                            <div style={{ position: "relative", width: "70px" }}>
                                                <span style={{ position: "absolute", left: "4px", top: "50%", transform: "translateY(-50%)", fontSize: "0.62rem", fontWeight: 700, color: "#64748B" }}>S/</span>
                                                <input type="number" value={editIncomeAmount} onChange={e => setEditIncomeAmount(e.target.value)}
                                                    onKeyDown={e => { if (e.key === "Enter") { updateFixedIncome(item.id, editIncomeName.trim(), parseFloat(editIncomeAmount) || 0); setEditingIncomeId(null); } if (e.key === "Escape") setEditingIncomeId(null); }}
                                                    style={{ width: "100%", padding: "3px 3px 3px 18px", borderRadius: "5px", border: "1px solid #E2E8F0", fontSize: "0.78rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                                            </div>
                                            <button onClick={() => { updateFixedIncome(item.id, editIncomeName.trim(), parseFloat(editIncomeAmount) || 0); setEditingIncomeId(null); }} style={{ background: "var(--domain-blue)", color: "white", border: "none", borderRadius: "4px", padding: "3px 5px", fontWeight: 800, fontSize: "0.6rem", cursor: "pointer" }}>OK</button>
                                            <button onClick={() => setEditingIncomeId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "2px", display: "flex" }}><X size={11} /></button>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isReceived ? "line-through" : "none", color: isReceived ? "#94A3B8" : "var(--text-carbon)" }}>
                                                {item.name}
                                            </span>
                                            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: isReceived ? "#10B981" : (item.active ? "var(--domain-blue)" : "#94A3B8") }}>
                                                S/ {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </span>
                                            <button onClick={() => { setEditingIncomeId(item.id); setEditIncomeName(item.name); setEditIncomeAmount(String(item.amount)); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "2px", display: "flex" }}><Edit2 size={11} /></button>
                                            <button onClick={() => removeFixedIncome(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "2px", display: "flex" }}><Trash2 size={11} /></button>
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
                                style={{ flex: 2, padding: "5px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", outline: "none" }} />
                            <div style={{ position: "relative", flex: 1 }}>
                                <span style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "0.72rem", fontWeight: 700, color: "#64748B" }}>S/</span>
                                <input type="number" placeholder="0" value={newIncomeAmount} onChange={e => setNewIncomeAmount(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && submitNewIncome()}
                                    style={{ width: "100%", padding: "5px 5px 5px 22px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.78rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                            </div>
                            <button onClick={submitNewIncome} style={{ background: "var(--domain-blue)", color: "white", border: "none", borderRadius: "6px", padding: "5px 8px", fontWeight: 800, fontSize: "0.65rem", cursor: "pointer" }}>OK</button>
                            <button onClick={() => setIsAddingIncome(false)} style={{ background: "#E2E8F0", border: "none", borderRadius: "6px", padding: "5px 7px", fontWeight: 800, fontSize: "0.65rem", cursor: "pointer" }}>X</button>
                        </motion.div>
                    ) : (
                        <button onClick={() => setIsAddingIncome(true)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
                            <Plus size={13} color="#CCC" /><span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#AAA" }}>Nuevo ingreso fijo...</span>
                        </button>
                    )}
                </div>

                {/* Fixed expenses card */}
                <div style={{ ...CARD, borderLeft: "4px solid #EF4444", display: "flex", flexDirection: "column", gap: "0.6rem", minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={LABEL}>Gastos Fijos</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#EF4444" }}>Pendiente: S/ {totalFixedPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            <TrendingDown size={14} color="#EF4444" />
                        </div>
                    </div>

                    {/* List of fixed expenses */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1, overflowY: "auto", maxHeight: "160px" }}>
                        {fixedExpenses.length === 0 && (
                            <p style={{ fontSize: "0.75rem", color: "#94A3B8", margin: 0 }}>Sin gastos fijos. Agrega uno abajo.</p>
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

            </div>

            {/* ── Row 5: Chart + Debts ─── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>

                {/* Cash flow chart */}
                <div style={{ ...CARD, display: "flex", flexDirection: "column", minHeight: "240px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>Flujo de Caja</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <button onClick={() => setShowAnalytics(true)} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "8px", padding: "3px 8px", display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "0.62rem", fontWeight: 700, color: "var(--domain-blue)" }}><PieChart size={11} /> Analizar</button>
                            <PillToggle options={["7d", "30d"]} value={chartPeriod} onChange={v => setChartPeriod(v as any)} />
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "6px" }}>
                        <LegendDot color="#10B981" label="Ingresos" />
                        <LegendDot color="#EF4444" label="Gastos" />
                    </div>
                    <div style={{ display: "flex", flex: 1, alignItems: "flex-end", gap: chartPeriod === "7d" ? "8px" : "3px", padding: "4px 0" }}>
                        {historyData.map((data, i) => {
                            const maxVal = Math.max(...historyData.map(h => Math.max(h.inc, h.exp)), 1);
                            const w = chartPeriod === "7d" ? "9px" : "4px";
                            return (
                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", height: "100%", justifyContent: "flex-end" }}>
                                    <div style={{ display: "flex", gap: "1px", alignItems: "flex-end", height: "100%", width: "100%", justifyContent: "center" }}>
                                        <motion.div initial={{ height: 0 }} animate={{ height: `${(data.inc / maxVal) * 100}%` }} transition={{ duration: 0.4 }} style={{ width: w, background: "#10B981", borderRadius: "2px 2px 0 0", opacity: 0.85 }} />
                                        <motion.div initial={{ height: 0 }} animate={{ height: `${(data.exp / maxVal) * 100}%` }} transition={{ duration: 0.4 }} style={{ width: w, background: "#EF4444", borderRadius: "2px 2px 0 0", opacity: 0.85 }} />
                                    </div>
                                    <span style={{ fontSize: "0.42rem", color: "#94A3B8" }}>{data.day}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Debts & collections */}
                <div style={{ ...CARD, display: "flex", flexDirection: "column", minHeight: "240px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>Deudas y Cobros</span>
                        <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={() => { setDebtMode("owe"); setShowDebtDetail(true); }} style={{ background: "rgba(239,68,68,0.08)", border: "none", color: "#EF4444", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer", padding: "3px 10px", borderRadius: "8px" }}>Debo</button>
                            <button onClick={() => { setDebtMode("owed"); setShowDebtDetail(true); }} style={{ background: "rgba(16,185,129,0.08)", border: "none", color: "#10B981", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer", padding: "3px 10px", borderRadius: "8px" }}>Me Deben</button>
                        </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, overflowY: "auto" }}>
                        {activeDebtsAndCollections.length === 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "6px", color: "#CBD5E1" }}>
                                <Check size={26} strokeWidth={1.5} />
                                <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Sin deudas activas</span>
                            </div>
                        ) : activeDebtsAndCollections.map((debt, i) => (
                            <div key={i} onClick={() => { setDebtMode(debt.isOwe ? "owe" : "owed"); setShowDebtDetail(true); }}
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: "12px", background: "#F8FAFC", border: "1px solid #F1F5F9", cursor: "pointer" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: debt.isOwe ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: debt.isOwe ? "#EF4444" : "#10B981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        {debt.isOwe ? <UserMinus size={14} /> : <UserPlus size={14} />}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>{debt.name}</div>
                                        {debt.contact && <div style={{ fontSize: "0.62rem", color: "#94A3B8" }}>{debt.contact}</div>}
                                    </div>
                                </div>
                                <span style={{ fontWeight: 800, fontSize: "0.88rem", color: debt.isOwe ? "#EF4444" : "#10B981" }}>{debt.isOwe ? "-" : "+"}S/ {debt.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                    </div>
                    {/* Footer with CORRECTED totals */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #F1F5F9" }}>
                        <span style={{ fontSize: "0.72rem", color: "#EF4444", fontWeight: 700 }}>Debo: S/ {realOwe.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        <span style={{ fontSize: "0.72rem", color: "#10B981", fontWeight: 700 }}>Me deben: S/ {realOwed.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

            </div>

            {/* ── Accounts accordion ─── */}
            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
                <button onClick={() => setIsAccountsVisible(v => !v)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC", border: "none", padding: "15px 20px", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <PiggyBank size={17} color="var(--domain-blue)" />
                        <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>Mis Cuentas ({accounts.length})</span>
                    </div>
                    <motion.div animate={{ rotate: isAccountsVisible ? 180 : 0 }}><ArrowDownCircle size={15} /></motion.div>
                </button>
                <AnimatePresence>
                    {isAccountsVisible && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
                            <div style={{ padding: "16px 20px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: "10px" }}>
                                    {accountsWithBalance.map(acc => (
                                        <div key={acc.id} style={{ background: "white", borderTop: `4px solid ${acc.color}`, borderRadius: "12px", padding: "10px", border: "1px solid #E2E8F0", position: "relative" }}>
                                            <button onClick={() => window.confirm("¿Eliminar esta cuenta?") && setAccounts(p => p.filter(a => a.id !== acc.id))} style={{ position: "absolute", top: "5px", right: "5px", background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "1px" }}><Trash2 size={10} /></button>
                                            <div style={{ fontSize: "0.62rem", color: "#64748B", fontWeight: 600 }}>{acc.name}</div>
                                            <div style={{ fontSize: "0.95rem", fontWeight: 900, marginTop: "3px" }}>S/ {acc.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                                        </div>
                                    ))}
                                    {!isAddingAccount ? (
                                        <button onClick={() => setIsAddingAccount(true)} style={{ borderRadius: "12px", padding: "10px", border: "2px dashed #E2E8F0", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px", color: "#94A3B8", minHeight: "62px" }}>
                                            <Plus size={16} /><span style={{ fontSize: "0.6rem", fontWeight: 700 }}>Nueva</span>
                                        </button>
                                    ) : (
                                        <div style={{ borderRadius: "12px", padding: "10px", border: "1px solid var(--domain-blue)", background: "#F8FAFF", display: "flex", flexDirection: "column", gap: "5px" }}>
                                            <input autoFocus placeholder="Nombre" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddAccount()} style={{ padding: "4px 7px", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.72rem", outline: "none" }} />
                                            <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                                <input type="color" value={newAccountColor} onChange={e => setNewAccountColor(e.target.value)} style={{ width: "26px", height: "26px", borderRadius: "5px", border: "1px solid #E2E8F0", padding: "1px", cursor: "pointer" }} />
                                                <button onClick={handleAddAccount} style={{ flex: 1, background: "var(--domain-blue)", color: "white", border: "none", borderRadius: "5px", padding: "3px", fontSize: "0.65rem", fontWeight: 800, cursor: "pointer" }}>OK</button>
                                                <button onClick={() => setIsAddingAccount(false)} style={{ background: "#E2E8F0", color: "#475569", border: "none", borderRadius: "5px", padding: "3px 6px", fontSize: "0.65rem", fontWeight: 800, cursor: "pointer" }}>X</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Quick log ─── */}
            <QuickTransactionForm addTransaction={addTransaction} accounts={accounts} />

            {/* ══════════════════════════════════════════════════════════════
                HISTORIAL DE FLUJO — navigable by period
            ══════════════════════════════════════════════════════════════ */}
            <div style={{ ...CARD }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "1.2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <BarChart3 size={18} color="var(--domain-blue)" />
                        <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800 }}>Historial de Flujo</h3>
                    </div>
                    <PillToggle
                        options={["week", "month", "year", "all"]}
                        labels={["Semana", "Mes", "Año", "Todo"]}
                        value={periodMode}
                        onChange={v => { setPeriodMode(v as PeriodMode); setPeriodRef(new Date()); }}
                    />
                </div>

                {/* Period navigator */}
                {periodMode !== "all" && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "1.2rem", background: "#F8FAFC", borderRadius: "12px", padding: "8px 16px" }}>
                        <button onClick={() => setPeriodRef(d => shiftPeriod(periodMode, d, -1))} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", display: "flex", alignItems: "center", padding: "2px" }}><ChevronLeft size={18} /></button>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Calendar size={13} color="#64748B" />
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, minWidth: "150px", textAlign: "center" }}>{periodLabel(periodMode, periodRef)}</span>
                        </div>
                        <button onClick={() => setPeriodRef(d => shiftPeriod(periodMode, d, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", display: "flex", alignItems: "center", padding: "2px" }}><ChevronRight size={18} /></button>
                    </div>
                )}

                {/* KPI cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "1.2rem" }}>
                    {[
                        { label: "Ingresos", val: periodStats.income, color: "#10B981", bg: "rgba(16,185,129,0.06)" },
                        { label: "Gastos", val: periodStats.expense, color: "#EF4444", bg: "rgba(239,68,68,0.06)" },
                        { label: "Neto", val: periodStats.net, color: periodStats.net >= 0 ? "var(--domain-blue)" : "#EF4444", bg: "rgba(0,85,255,0.04)" },
                    ].map((k, i) => (
                        <div key={i} style={{ background: k.bg, borderRadius: "12px", padding: "10px 12px", textAlign: "center" }}>
                            <div style={{ ...LABEL, color: k.color, marginBottom: "3px" }}>{k.label}</div>
                            <div style={{ fontWeight: 900, fontSize: "1.05rem", color: k.color }}>S/ {k.val.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                        </div>
                    ))}
                </div>

                {/* Type filter */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "1rem", flexWrap: "wrap" }}>
                    {(["all", "ingreso", "gasto"] as TxFilter[]).map(f => (
                        <button key={f} onClick={() => setTxFilter(f)} style={{ padding: "4px 14px", borderRadius: "20px", border: `1px solid ${txFilter === f ? "var(--domain-blue)" : "#E2E8F0"}`, background: txFilter === f ? "var(--domain-blue)" : "transparent", color: txFilter === f ? "white" : "#64748B", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                            {f === "all" ? "Todos" : f === "ingreso" ? "Ingresos" : "Gastos"}
                        </button>
                    ))}
                    <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "#94A3B8", fontWeight: 600, alignSelf: "center" }}>{filteredTxs.length} movimientos</span>
                </div>

                {/* Transaction list */}
                {filteredTxs.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2.5rem 0", gap: "8px", color: "#CBD5E1" }}>
                        <DollarSign size={32} strokeWidth={1.5} />
                        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Sin movimientos en este período</span>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: "420px", overflowY: "auto", paddingRight: "2px" }}>
                        {filteredTxs.map(tx => (
                            <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "12px", background: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                                <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: tx.type === "ingreso" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: tx.type === "ingreso" ? "#10B981" : "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    {tx.type === "ingreso" ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: "0.83rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.text}</div>
                                    <div style={{ fontSize: "0.62rem", color: "#94A3B8", display: "flex", alignItems: "center", gap: "5px" }}>
                                        {tx.fullDate} · {tx.date}
                                        {tx.category && <span style={{ background: "#F1F5F9", padding: "1px 6px", borderRadius: "10px", color: "#64748B", fontWeight: 700 }}>{tx.category}</span>}
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                                    <span style={{ fontWeight: 800, fontSize: "0.88rem", color: tx.type === "ingreso" ? "#10B981" : "#EF4444" }}>
                                        {tx.type === "ingreso" ? "+" : "-"}S/ {Math.abs(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                    <button onClick={() => removeTransaction(tx.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "2px", display: "flex" }}><Trash2 size={12} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Modals ─── */}
            <AnimatePresence>
                {selectedProject && <ProjectDetailView project={selectedProject} onClose={() => setSelectedProject(null)} accounts={accounts} setAccounts={setAccounts} transactions={transactions} addProjectTask={addProjectTask} toggleProjectTask={toggleProjectTask} removeProjectTask={removeProjectTask} updateProjectTask={updateProjectTask} reorderProjectTasks={reorderProjectTasks} promoteTaskToRoutine={promoteTaskToRoutine} rutinas={rutinas} addProjectCategory={addProjectCategory} removeProjectCategory={removeProjectCategory} addInventoryItem={addInventoryItem} updateInventoryItemQuantity={updateInventoryItemQuantity} removeInventoryItem={removeInventoryItem} projects={projects} updateProject={updateProject} />}
                {showDebtDetail && <DebtDetailView transactions={transactions} accounts={accounts} initialMode={debtMode} onClose={() => setShowDebtDetail(false)} repayDebt={repayDebt} removeTransaction={removeTransaction} updateTransactionGroup={updateTransactionGroup} addTransaction={addTransaction} />}
            </AnimatePresence>
            <AnimatePresence>
                {showAnalytics && <AnalyticsView transactions={transactions} onClose={() => setShowAnalytics(false)} />}
            </AnimatePresence>
        </div>
    );
};

// ─── Shared micro-components ──────────────────────────────────────────────────
const LegendDot = ({ color, label }: { color: string; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
        <span style={{ fontSize: "0.58rem", color: "#64748B" }}>{label}</span>
    </div>
);

const PillToggle = ({ options, labels, value, onChange }: { options: string[]; labels?: string[]; value: string; onChange: (v: string) => void }) => (
    <div style={{ display: "flex", background: "#F1F5F9", padding: "2px", borderRadius: "10px", gap: "2px" }}>
        {options.map((o, i) => (
            <button key={o} onClick={() => onChange(o)} style={{ padding: "3px 8px", borderRadius: "8px", border: "none", background: value === o ? "white" : "transparent", color: value === o ? "var(--domain-blue)" : "#64748B", fontSize: "0.62rem", fontWeight: 800, cursor: "pointer", boxShadow: value === o ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
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
        <div style={{ display: "flex", gap: "7px", marginBottom: "7px", alignItems: "center", padding: "8px", background: "#F8FAFC", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
            <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 2, padding: "5px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.82rem", outline: "none" }} />
            <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={{ flex: 1, padding: "5px 8px", borderRadius: "7px", border: "1px solid #E2E8F0", fontSize: "0.82rem", outline: "none" }} />
            <button onClick={() => { updateFixedExpense(expense.id, { text: editName, amount: Number(editAmount) }); setIsEditing(false); }} style={{ background: "var(--domain-blue)", color: "white", border: "none", borderRadius: "7px", padding: "5px 10px", fontWeight: 800, cursor: "pointer" }}>OK</button>
            <button onClick={() => setIsEditing(false)} style={{ background: "#E2E8F0", border: "none", borderRadius: "7px", padding: "5px 8px", fontWeight: 800, cursor: "pointer" }}>X</button>
        </div>
    );

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: "1px solid #F1F5F9" }}>
            <div onClick={() => toggleFixedExpense(expense.id)} style={{ width: "30px", height: "17px", borderRadius: "9px", background: expense.active ? "var(--domain-blue)" : "#CBD5E1", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                <div style={{ width: "13px", height: "13px", borderRadius: "50%", background: "white", position: "absolute", top: "2px", left: expense.active ? "15px" : "2px", transition: "left 0.15s" }} />
            </div>
            <button onClick={() => isPaid ? unmarkFixedExpensePaid(expense.id, monthStr) : markFixedExpensePaid(expense.id, monthStr)} style={{ background: isPaid ? "#10B981" : "#F1F5F9", border: "none", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <span style={{ color: isPaid ? "white" : "#94A3B8", fontSize: "0.62rem", fontWeight: 900 }}>ok</span>
            </button>
            <span style={{ textDecoration: isPaid ? "line-through" : "none", fontWeight: 600, flex: 1, fontSize: "0.83rem", color: isPaid ? "#94A3B8" : "var(--text-carbon)", opacity: expense.active ? 1 : 0.45 }}>
                {expense.text}
                {expense.dueDay && <span style={{ fontSize: "0.6rem", color: "#94A3B8", marginLeft: "5px" }}>dia {expense.dueDay}</span>}
            </span>
            <span style={{ fontWeight: 800, fontSize: "0.88rem", opacity: expense.active ? 1 : 0.45, color: isPaid ? "#10B981" : "var(--text-carbon)" }}>S/ {expense.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            <button onClick={() => setIsEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "3px", display: "flex" }}><Edit2 size={12} /></button>
            <button onClick={() => removeFixedExpense(expense.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "3px", display: "flex" }}><Trash2 size={12} /></button>
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
            <Plus size={13} color="#CCC" /><span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#AAA" }}>Nuevo gasto fijo...</span>
        </button>
    );

    return (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#F8FAFC", padding: "10px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", gap: "6px" }}>
                <input autoFocus placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={{ flex: 2, padding: "6px", borderRadius: "8px", border: "1px solid #DDD", fontSize: "0.8rem", outline: "none" }} />
                <input type="number" placeholder="S/ " value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={{ flex: 1, padding: "6px", borderRadius: "8px", border: "1px solid #DDD", fontSize: "0.8rem", outline: "none" }} />
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {projects.length > 0 && <select value={projectId || ""} onChange={e => setProjectId(e.target.value ? Number(e.target.value) : undefined)} style={{ flex: 1, padding: "4px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "0.7rem", fontWeight: 700, background: "white", outline: "none" }}><option value="">Proyecto?</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
                <input type="number" placeholder="Dia" value={dueDay || ""} onChange={e => setDueDay(e.target.value ? Number(e.target.value) : undefined)} min="1" max="31" style={{ width: "44px", padding: "4px", borderRadius: "6px", border: "1px solid #DDD", fontSize: "0.7rem", fontWeight: 800, background: "#FFFDF0", textAlign: "center", outline: "none" }} />
                <button onClick={() => setOpen(false)} style={{ padding: "4px 8px", borderRadius: "6px", border: "none", background: "#E2E8F0", color: "#475569", fontSize: "0.65rem", fontWeight: 800, cursor: "pointer" }}>X</button>
                <button onClick={submit} style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: "var(--domain-blue)", color: "white", fontSize: "0.65rem", fontWeight: 800, cursor: "pointer" }}>OK</button>
            </div>
        </motion.div>
    );
};

// ─── Quick transaction form ───────────────────────────────────────────────────
const QuickTransactionForm = ({ addTransaction, accounts }: any) => {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [amount, setAmount] = useState("");
    const [type, setType] = useState<"ingreso" | "gasto">("gasto");
    const [accountId, setAccountId] = useState<number | undefined>(undefined);
    const [isCashless, setIsCashless] = useState(false);
    const [category, setCategory] = useState("");

    const submit = () => {
        if (text && amount) {
            addTransaction(text, parseFloat(amount), type, false, undefined, accountId, isCashless, category || undefined);
            setText(""); setAmount(""); setCategory(""); setOpen(false);
        }
    };

    if (!open) return (
        <button onClick={() => setOpen(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "var(--domain-blue)", border: "none", borderRadius: "14px", padding: "13px", cursor: "pointer", color: "white", fontWeight: 800, fontSize: "0.88rem", boxShadow: "0 4px 14px rgba(0,85,255,0.22)" }}>
            <Plus size={17} /> Registrar Movimiento
        </button>
    );

    return (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ background: "#FFFFFF", borderRadius: "16px", padding: "1.2rem", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(15,23,42,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem" }}>
                <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>Nuevo Movimiento</span>
                <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: "1.1rem" }}>X</button>
            </div>
            <div style={{ display: "flex", background: "#F1F5F9", padding: "3px", borderRadius: "10px", gap: "3px", marginBottom: "10px" }}>
                <button onClick={() => setType("gasto")} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "none", background: type === "gasto" ? "#EF4444" : "transparent", color: type === "gasto" ? "white" : "#64748B", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>Gasto</button>
                <button onClick={() => setType("ingreso")} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "none", background: type === "ingreso" ? "#10B981" : "transparent", color: type === "ingreso" ? "white" : "#64748B", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>Ingreso</button>
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input autoFocus placeholder="Descripcion" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={{ flex: 2, padding: "8px 10px", borderRadius: "10px", border: "1px solid #E2E8F0", fontSize: "0.83rem", outline: "none" }} />
                <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "#64748B", fontSize: "0.88rem" }}>S/ </span>
                    <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} style={{ width: "100%", padding: "8px 8px 8px 30px", borderRadius: "10px", border: "1px solid #E2E8F0", fontSize: "0.83rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                </div>
            </div>
            <div style={{ display: "flex", gap: "7px", marginBottom: "10px", flexWrap: "wrap" }}>
                <input placeholder="Categoria (opcional)" value={category} onChange={e => setCategory(e.target.value)} style={{ flex: 2, padding: "6px 10px", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "0.75rem", outline: "none", minWidth: "100px" }} />
                {accounts.length > 0 && <select value={accountId || ""} onChange={e => setAccountId(e.target.value ? Number(e.target.value) : undefined)} style={{ flex: 2, padding: "6px 8px", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "0.73rem", fontWeight: 600, background: "white", outline: "none", minWidth: "90px" }}><option value="">Cuenta (opc.)</option>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
                <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.73rem", fontWeight: 600, color: "#64748B", cursor: "pointer" }}>
                    <input type="checkbox" checked={isCashless} onChange={e => setIsCashless(e.target.checked)} style={{ accentColor: "var(--domain-blue)" }} /> Sin efectivo
                </label>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setOpen(false)} style={{ flex: 1, padding: "9px", borderRadius: "10px", border: "1px solid #E2E8F0", background: "transparent", color: "#64748B", fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
                <button onClick={submit} style={{ flex: 2, padding: "9px", borderRadius: "10px", border: "none", background: type === "gasto" ? "#EF4444" : "#10B981", color: "white", fontWeight: 800, cursor: "pointer", fontSize: "0.83rem" }}>
                    {type === "gasto" ? "Registrar Gasto" : "Registrar Ingreso"}
                </button>
            </div>
        </motion.div>
    );
};

