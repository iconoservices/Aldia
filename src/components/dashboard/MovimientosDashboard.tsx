import { useState, useMemo } from "react";
import {
    TrendingUp, TrendingDown, Trash2, DollarSign,
    ChevronLeft, ChevronRight, Calendar, BarChart3
} from "lucide-react";
import type { Transaction } from "../../hooks/useAlDiaState";
import { C, bento, etiqueta, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina } from "../../theme";
import {
    getPeriodBounds, periodLabel, shiftPeriod, PillToggle,
    type PeriodMode, type TxFilter,
} from "./FinanzasDashboard";

/* ══════════════════════════════════════════════════════════════════
   MovimientosDashboard — el Historial de Flujo que antes vivía dentro
   de Finanzas. Se separó a su propio tab porque es una lista que crece
   sin parar (filas), mientras el resto de Finanzas son fotos fijas del
   momento (balance, cuentas, presupuesto) — mezclarlos hacía que
   Finanzas se sintiera más larga de lo necesario. La lógica de período
   (getPeriodBounds/periodLabel/shiftPeriod/PillToggle) se comparte con
   Finanzas en vez de duplicarse.
══════════════════════════════════════════════════════════════════ */

interface MovimientosProps {
    transactions: Transaction[];
    removeTransaction: (id: number) => void;
}

const CARD: React.CSSProperties = { ...bento, padding: "1.5rem" };
const LABEL: React.CSSProperties = etiqueta;

export const MovimientosDashboard = ({ transactions, removeTransaction }: MovimientosProps) => {
    const movil = useIsMobile();
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

    return (
        <div style={{
            display: "flex", flexDirection: "column",
            gap: movil ? "1rem" : "1.5rem",
            ...paddingPagina(movil),
            color: "var(--text-carbon)",
        }}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Movimientos</h2>
                    <p style={subtituloPagina}>{filteredTxs.length} en este período</p>
                </div>
            </div>

            <div style={{ ...CARD }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "1.2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <BarChart3 size={18} color={C.primary} />
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
                        { label: "Neto", val: periodStats.net, color: periodStats.net >= 0 ? C.primary : "#EF4444", bg: "rgba(148,74,24,0.06)" },
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
                        <button key={f} onClick={() => setTxFilter(f)} style={{ padding: "4px 14px", borderRadius: "20px", border: `1px solid ${txFilter === f ? C.primary : "#E2E8F0"}`, background: txFilter === f ? C.primary : "transparent", color: txFilter === f ? "white" : "#64748B", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
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
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
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
        </div>
    );
};
