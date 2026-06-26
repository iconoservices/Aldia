import { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import type { Transaction, FixedExpense } from '../../hooks/useAlDiaState';

type PeriodMode = "day" | "week" | "month" | "year" | "all";

interface Props {
    transactions: Transaction[];
    fixedExpenses: FixedExpense[];
    fixedIncomeItems: { id: number; name: string; amount: number; active: boolean; lastReceivedMonth?: string }[];
    currentMonthStr: string;
}

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
            width: "12px", height: "12px", borderRadius: "50%",
            border: `1.5px solid ${checked ? "var(--domain-blue)" : "#94A3B8"}`,
            background: checked ? "var(--domain-blue)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.15s ease", flexShrink: 0,
        }}
    >
        {checked && <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "white" }} />}
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

export const ProyeccionOriginalDashboard = ({ transactions, fixedExpenses, fixedIncomeItems, currentMonthStr }: Props) => {
    const [includeDebts, setIncludeDebts] = useState(false);
    const [includeFixed, setIncludeFixed] = useState(true);
    const [includeOwed, setIncludeOwed] = useState(false);
    const [includeBalance, setIncludeBalance] = useState(true);
    const [includeSalary, setIncludeSalary] = useState(true);
    const [topPeriod, setTopPeriod] = useState<PeriodMode>("month");

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

    const monthlyFixedTotal = useMemo(() =>
        fixedExpenses.filter(e => e.active).reduce((a, e) => a + e.amount, 0),
        [fixedExpenses]);

    const totalFixedPending = useMemo(() =>
        fixedExpenses.filter(e => e.active && e.lastPaidMonth !== currentMonthStr).reduce((a, e) => a + e.amount, 0),
        [fixedExpenses, currentMonthStr]);

    const fixedIncomeTotal = useMemo(() =>
        fixedIncomeItems.filter(f => f.active).reduce((s, f) => s + f.amount, 0),
        [fixedIncomeItems]);

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
        return monthlyFixedTotal * 12;
    }, [topPeriod, totalFixedPending, monthlyFixedTotal]);

    const projectedPeriodLabel = useMemo(() => {
        if (topPeriod === "day") return "Proyección del día";
        if (topPeriod === "week") return "Proyección de la sem.";
        if (topPeriod === "year") return "Proyección del año";
        return "Proyección del mes";
    }, [topPeriod]);

    const periodBalance = useMemo(() => {
        if (topPeriod === "all") return transactions.filter(tx => !tx.isCashless).reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
        const { start, end } = getPeriodBounds(topPeriod, new Date());
        return transactions
            .filter(tx => !tx.isCashless && tx.fullDate >= start && tx.fullDate <= end)
            .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    }, [transactions, topPeriod]);

    const projectedResources = (includeBalance ? periodBalance : 0) + (includeSalary ? fixedIncomeTotal * periodMultiplier : 0) + (includeOwed ? realOwed : 0);
    const projectedExpenses = (includeFixed ? projectedFixedVal : 0) + (includeDebts ? realOwe : 0);
    const projectedSavings = projectedResources - projectedExpenses;

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

    return (
        <div style={{ paddingBottom: '5rem' }}>
            <div style={{ ...CARD, borderLeft: "4px solid #10B981" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "8px" }}>
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
                            val: fixedIncomeTotal * periodMultiplier,
                            color: (fixedIncomeTotal > 0) ? (includeSalary ? "#10B981" : "#94A3B8") : "#94A3B8",
                            sub: fixedIncomeTotal > 0 ? (includeSalary ? "Fijo incluido" : "Fijo excluido") : "Sin ingresos fijos",
                            checked: fixedIncomeTotal > 0 ? includeSalary : false,
                            onToggle: fixedIncomeTotal > 0 ? (() => setIncludeSalary(v => !v)) : undefined,
                            opacity: fixedIncomeTotal === 0 ? 0.5 : (includeSalary ? 1 : 0.65)
                        },
                        {
                            label: "Ingresos Proy.",
                            val: periodBalance + (includeSalary ? fixedIncomeTotal * periodMultiplier : 0),
                            color: (periodBalance + (includeSalary ? fixedIncomeTotal * periodMultiplier : 0)) >= 0 ? "#10B981" : "#EF4444",
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
        </div>
    );
};
