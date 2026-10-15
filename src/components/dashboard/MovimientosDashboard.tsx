import { useState, useMemo } from "react";
import {
    TrendingUp, TrendingDown, Trash2, DollarSign, Edit2, MoreVertical, Undo2,
    ChevronLeft, ChevronRight, Search, X
} from "lucide-react";
import type { Transaction } from "../../hooks/useAlDiaState";
import { C, etiqueta, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina } from "../../theme";
import {
    getPeriodBounds, periodLabel, shiftPeriod, PillToggle,
    type PeriodMode, type TxFilter,
} from "./FinanzasDashboard";
import { ConfirmDialog } from "../ui/ConfirmDialog";

/* ══════════════════════════════════════════════════════════════════
   MovimientosDashboard — el Historial de Flujo que antes vivía dentro
   de Finanzas. Se separó a su propio tab porque es una lista que crece
   sin parar (filas), mientras el resto de Finanzas son fotos fijas del
   momento (balance, cuentas, presupuesto). La lógica de período
   (getPeriodBounds/periodLabel/shiftPeriod/PillToggle) se comparte con
   Finanzas en vez de duplicarse.

   Diseño: una franja arriba con período + resumen (Entró / Salió / Neto)
   y la lista agrupada por día, sin tarjetas dentro de tarjetas.
══════════════════════════════════════════════════════════════════ */

interface MovimientosProps {
    transactions: Transaction[];
    removeTransaction: (id: number) => void;
    undoFixedExpensePayment?: (txId: number) => void;
    updateTransaction: (id: number, updates: Partial<Transaction>) => void;
    accounts: { id: number; name: string; color: string }[];
    incomeCategories?: string[];
    expenseCategories?: string[];
}

const txInputStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.85rem", outline: "none", background: "white", boxSizing: "border-box", width: "100%" };
const txLabelStyle: React.CSSProperties = { fontSize: "0.6rem", fontWeight: 800, color: C.outline, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "2px", display: "block" };

const fmt = (n: number) => Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

// "Hoy", "Ayer" o "mar 14 oct"
const etiquetaDia = (fullDate: string) => {
    const hoy = new Date().toLocaleDateString("en-CA");
    const ayer = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");
    if (fullDate === hoy) return "Hoy";
    if (fullDate === ayer) return "Ayer";
    return new Date(fullDate + "T00:00:00").toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" }).replace(".", "");
};

// Un bloque del resumen: total + desglose en una sola línea chica.
const Resumen = ({ titulo, total, color, filas, signo }: {
    titulo: string;
    total: number;
    color: string;
    signo?: string;
    filas: { et: string; val: number }[];
}) => {
    const visibles = filas.filter(f => f.val > 0);
    return (
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
            <div style={{ ...etiqueta, color: C.outline }}>{titulo}</div>
            <div style={{ fontWeight: 800, fontSize: "1.3rem", color, lineHeight: 1.2, whiteSpace: "nowrap" }}>{signo}S/ {fmt(total)}</div>
            <div style={{ fontSize: "0.68rem", color: C.outline, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {visibles.length === 0 ? "Sin movimientos" : visibles.map(f => `${f.et} S/ ${fmt(f.val)}`).join(" · ")}
            </div>
        </div>
    );
};

export const MovimientosDashboard = ({ transactions, removeTransaction, undoFixedExpensePayment, updateTransaction, accounts, incomeCategories = [], expenseCategories = [] }: MovimientosProps) => {
    const movil = useIsMobile();
    const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
    const [periodRef, setPeriodRef] = useState<Date>(new Date());
    const [txFilter, setTxFilter] = useState<TxFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [accountFilter, setAccountFilter] = useState<number | "all">("all");
    const [soloSinCuenta, setSoloSinCuenta] = useState(false);

    const accountById = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);

    const { start: pStart, end: pEnd } = useMemo(() => getPeriodBounds(periodMode, periodRef), [periodMode, periodRef]);

    const periodTxs = useMemo(() =>
        transactions.filter(tx => !tx.isDebt && tx.fullDate >= pStart && tx.fullDate <= pEnd),
        [transactions, pStart, pEnd]);

    // La lista sigue mostrando todo (transferencias y deudas incluidas: son
    // movimientos reales que el usuario quiere ver/editar), pero el resumen de
    // arriba reparte cada movimiento en UN solo balde:
    //   · Transferencia entre cuentas propias → se ignora del todo (mover plata
    //     de un bolsillo a otro no es ingreso ni gasto).
    //   · Categorías "Préstamos" / "Deudas" → movimiento de deuda: prestar,
    //     cobrar o devolver. Tampoco es ingreso ni gasto real — la plata sigue
    //     siendo tuya, solo cambia de manos. Se muestra aparte.
    //   · Ingreso con categoría "Ayuda…" → entró de afuera (no lo generaste tú).
    //   · Lo que queda → lo que realmente generaste / tu consumo real.
    const periodStats = useMemo(() => {
        let generado = 0, ayuda = 0, cobroDeuda = 0;
        let gastoReal = 0, prestamoDado = 0, pagoDeuda = 0;
        for (const t of periodTxs) {
            const cat = t.category || "";
            if (cat === "Transferencia") continue;
            const monto = Math.abs(Number(t.amount) || 0);
            const esDeuda = cat === "Préstamos" || cat === "Deudas";
            if (t.type === "ingreso") {
                if (esDeuda) cobroDeuda += monto;
                else if (/^ayuda/i.test(cat)) ayuda += monto;
                else generado += monto;
            } else if (t.type === "gasto") {
                if (cat === "Préstamos") prestamoDado += monto;
                else if (cat === "Deudas") pagoDeuda += monto;
                else gastoReal += monto;
            }
        }
        const ingresoTotal = generado + ayuda + cobroDeuda;
        const gastoTotal = gastoReal + prestamoDado + pagoDeuda;
        return {
            generado, ayuda, cobroDeuda, ingresoTotal,
            gastoReal, prestamoDado, pagoDeuda, gastoTotal,
            // Neto real: lo que generaste + ayuda − consumo. No mete préstamos ni
            // cobros: esos no cambian tu patrimonio, solo mueven plata ya tuya.
            netoReal: generado + ayuda - gastoReal,
        };
    }, [periodTxs]);

    const filteredTxs = useMemo(() => {
        let list = txFilter === "all" ? periodTxs : periodTxs.filter(t => t.type === txFilter);
        if (accountFilter !== "all") list = list.filter(t => t.accountId === accountFilter);
        if (soloSinCuenta) list = list.filter(t => !t.accountId);
        const q = searchQuery.trim().toLowerCase();
        if (q) list = list.filter(t => t.text.toLowerCase().includes(q) || t.contact?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q));
        return list;
    }, [periodTxs, txFilter, accountFilter, soloSinCuenta, searchQuery]);

    // Movimientos que quedaron sin cuenta (se olvidó elegirla): se pueden filtrar y asignar.
    const sinCuentaCount = useMemo(() => periodTxs.filter(t => !t.accountId).length, [periodTxs]);

    // Agrupados por día (el más reciente primero), con el neto de cada día.
    const dias = useMemo(() => {
        const mapa = new Map<string, Transaction[]>();
        [...filteredTxs]
            .sort((a, b) => b.fullDate.localeCompare(a.fullDate) || b.id - a.id)
            .forEach(t => mapa.set(t.fullDate, [...(mapa.get(t.fullDate) ?? []), t]));
        return [...mapa.entries()].map(([fecha, txs]) => ({
            fecha, txs,
            neto: txs.reduce((s, t) => s + (t.type === "ingreso" ? 1 : -1) * Math.abs(Number(t.amount) || 0), 0),
        }));
    }, [filteredTxs]);

    const neto = periodStats.netoReal;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "0.75rem" : "1rem", ...paddingPagina(movil), color: "var(--text-carbon)" }}>

            {/* Título + período, todo en una fila */}
            <div style={{ ...cabecera(movil), alignItems: movil ? "stretch" : "center" }}>
                <div>
                    <h2 style={tituloPagina}>Movimientos</h2>
                    <p style={subtituloPagina}>{filteredTxs.length} en este período</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: movil ? "space-between" : "flex-end" }}>
                    {periodMode !== "all" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                            <button onClick={() => setPeriodRef(d => shiftPeriod(periodMode, d, -1))} title="Anterior" style={{ background: "none", border: "none", cursor: "pointer", color: C.onSurfaceVariant, display: "flex", alignItems: "center", padding: "4px" }}><ChevronLeft size={18} /></button>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: movil ? "120px" : "140px", textAlign: "center" }}>{periodLabel(periodMode, periodRef)}</span>
                            <button onClick={() => setPeriodRef(d => shiftPeriod(periodMode, d, 1))} title="Siguiente" style={{ background: "none", border: "none", cursor: "pointer", color: C.onSurfaceVariant, display: "flex", alignItems: "center", padding: "4px" }}><ChevronRight size={18} /></button>
                        </div>
                    )}
                    <PillToggle
                        options={["week", "month", "year", "all"]}
                        labels={["Semana", "Mes", "Año", "Todo"]}
                        value={periodMode}
                        onChange={v => { setPeriodMode(v as PeriodMode); setPeriodRef(new Date()); }}
                    />
                </div>
            </div>

            {/* Resumen: Entró · Salió · Neto real en una sola franja */}
            <div style={{
                display: "flex", flexWrap: "wrap", gap: movil ? "10px 16px" : "16px 28px", alignItems: "flex-start",
                background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: "14px", padding: movil ? "12px 14px" : "14px 20px",
            }}>
                <Resumen titulo="Entró" signo="+" total={periodStats.ingresoTotal} color={C.verde} filas={[
                    { et: "Generaste", val: periodStats.generado },
                    { et: "Ayuda", val: periodStats.ayuda },
                    { et: "Cobro de deudas", val: periodStats.cobroDeuda },
                ]} />
                <Resumen titulo="Salió" signo="−" total={periodStats.gastoTotal} color={C.rojo} filas={[
                    { et: "Gasto real", val: periodStats.gastoReal },
                    { et: "Préstamos", val: periodStats.prestamoDado },
                    { et: "Deudas", val: periodStats.pagoDeuda },
                ]} />
                <div style={{ flex: "1 1 180px", minWidth: 0, background: neto >= 0 ? "rgba(16,185,129,0.09)" : "rgba(239,68,68,0.08)", borderRadius: "10px", padding: "8px 12px" }}>
                    <div style={{ ...etiqueta, color: neto >= 0 ? C.verde : C.rojo }}>Neto real</div>
                    <div style={{ fontWeight: 800, fontSize: "1.3rem", lineHeight: 1.2, whiteSpace: "nowrap", color: neto >= 0 ? C.verde : C.rojo }}>{neto >= 0 ? "+" : "−"}S/ {fmt(neto)}</div>
                    <div style={{ fontSize: "0.66rem", color: C.outline, fontWeight: 600 }}>generaste + ayuda − gasto real</div>
                </div>
            </div>

            {/* Filtros en una fila: buscar · cuenta · tipo */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: movil ? "1 1 100%" : "1 1 240px", minWidth: 0 }}>
                    <Search size={14} color={C.outline} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
                    <input
                        placeholder="Buscar por texto, contacto o categoría..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ width: "100%", padding: "9px 30px", borderRadius: "10px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.85rem", outline: "none", boxSizing: "border-box", background: C.surfaceLowest }}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.outline, padding: "2px", display: "flex" }}><X size={13} /></button>
                    )}
                </div>
                {accounts.length > 0 && (
                    <select value={accountFilter} onChange={e => setAccountFilter(e.target.value === "all" ? "all" : Number(e.target.value))} style={{ padding: "9px 10px", borderRadius: "10px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.82rem", fontWeight: 700, background: C.surfaceLowest, cursor: "pointer", flex: movil ? "1 1 45%" : undefined }}>
                        <option value="all">Todas las cuentas</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                )}
                <div style={{ display: "flex", gap: "6px", flex: movil ? "1 1 45%" : undefined }}>
                    {(["all", "ingreso", "gasto"] as TxFilter[]).map(f => (
                        <button key={f} onClick={() => setTxFilter(f)} style={{ padding: "7px 14px", borderRadius: "999px", border: `1px solid ${txFilter === f ? C.primary : C.outlineVariant}`, background: txFilter === f ? C.primary : "transparent", color: txFilter === f ? "white" : C.onSurfaceVariant, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s", flex: movil ? 1 : undefined }}>
                            {f === "all" ? "Todos" : f === "ingreso" ? "Ingresos" : "Gastos"}
                        </button>
                    ))}
                    {(sinCuentaCount > 0 || soloSinCuenta) && (
                        <button onClick={() => setSoloSinCuenta(v => !v)} title="Movimientos que no salen de ninguna cuenta" style={{ padding: "7px 14px", borderRadius: "999px", border: `1px solid ${soloSinCuenta ? C.rojo : "rgba(239,68,68,0.35)"}`, background: soloSinCuenta ? C.rojo : "rgba(239,68,68,0.06)", color: soloSinCuenta ? "white" : C.rojo, fontSize: "0.75rem", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", flex: movil ? 1 : undefined }}>
                            Sin cuenta ({sinCuentaCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Lista agrupada por día */}
            {filteredTxs.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2.5rem 0", gap: "8px", color: C.outlineVariant }}>
                    <DollarSign size={32} strokeWidth={1.5} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Sin movimientos en este período</span>
                </div>
            ) : (
                <div style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: "14px", overflow: "visible" }}>
                    {dias.map((dia, i) => (
                        <div key={dia.fecha}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 14px", background: C.surfaceContainerLow, borderTop: i === 0 ? "none" : `1px solid ${C.outlineVariant}`, borderBottom: `1px solid ${C.surfaceContainerHigh}`, borderRadius: i === 0 ? "14px 14px 0 0" : 0 }}>
                                <span style={{ ...etiqueta, textTransform: "capitalize", letterSpacing: "0.02em" }}>{etiquetaDia(dia.fecha)}</span>
                                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: dia.neto >= 0 ? C.verde : C.rojo }}>{dia.neto >= 0 ? "+" : "−"}S/ {fmt(dia.neto)}</span>
                            </div>
                            {dia.txs.map(tx => (
                                <MovimientoRow key={tx.id} tx={tx} accountById={accountById} accounts={accounts} removeTransaction={removeTransaction} undoFixedExpensePayment={undoFixedExpensePayment} updateTransaction={updateTransaction} incomeCategories={incomeCategories} expenseCategories={expenseCategories} />
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Movimiento row ────────────────────────────────────────────────────────────
const MovimientoRow = ({ tx, accountById, accounts, removeTransaction, undoFixedExpensePayment, updateTransaction, incomeCategories = [], expenseCategories = [] }: {
    tx: Transaction;
    accountById: Map<number, { id: number; name: string; color: string }>;
    accounts: { id: number; name: string; color: string }[];
    removeTransaction: (id: number) => void;
    undoFixedExpensePayment?: (txId: number) => void;
    updateTransaction: (id: number, updates: Partial<Transaction>) => void;
    incomeCategories?: string[];
    expenseCategories?: string[];
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(tx.text);
    const [editAmount, setEditAmount] = useState(String(Math.abs(tx.amount)));
    const [editAccountId, setEditAccountId] = useState<number | undefined>(tx.accountId);
    const [editCategory, setEditCategory] = useState(tx.category || "");
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmUndo, setConfirmUndo] = useState(false);

    const categoriasDisponibles = tx.type === "ingreso" ? incomeCategories : expenseCategories;
    // Pagos de gastos fijos: se pueden deshacer (por si se apretó "Pagué" sin querer)
    const esPagoFijo = tx.category === "Gastos Fijos" && /^Pago: /.test(tx.text) && !!undoFixedExpensePayment;
    const monto = Math.abs(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 });

    const save = () => {
        const value = Math.abs(Number(editAmount)) || 0;
        updateTransaction(tx.id, { text: editText, amount: tx.type === "ingreso" ? value : -value, accountId: editAccountId, category: editCategory || undefined });
        setIsEditing(false);
    };

    if (isEditing) return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 14px", background: C.surface, borderBottom: `1px solid ${C.surfaceContainerHigh}` }}>
            <div>
                <label style={txLabelStyle}>Descripción</label>
                <input autoFocus value={editText} onChange={e => setEditText(e.target.value)} style={txInputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                    <label style={txLabelStyle}>Monto</label>
                    <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} style={txInputStyle} />
                </div>
                <div>
                    <label style={txLabelStyle}>Cuenta</label>
                    <select value={editAccountId ?? ""} onChange={e => setEditAccountId(e.target.value ? Number(e.target.value) : undefined)} style={{ ...txInputStyle, fontWeight: 700, cursor: "pointer" }}>
                        <option value="">Sin cuenta</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
            </div>
            {categoriasDisponibles.length > 0 && (
                <div>
                    <label style={txLabelStyle}>Categoría</label>
                    <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{ ...txInputStyle, fontWeight: 700, cursor: "pointer" }}>
                        <option value="">Sin categoría</option>
                        {categoriasDisponibles.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "2px" }}>
                <button onClick={() => setIsEditing(false)} style={{ background: "none", border: `1px solid ${C.outlineVariant}`, color: C.onSurfaceVariant, borderRadius: "8px", padding: "7px 14px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Cancelar</button>
                <button onClick={save} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "8px", padding: "7px 14px", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}>Guardar</button>
            </div>
        </div>
    );

    const account = tx.accountId ? accountById.get(tx.accountId) : undefined;
    const menuItem = (icon: React.ReactNode, texto: string, onClick: () => void, color: string = C.onSurface) => (
        <button onClick={() => { setMenuOpen(false); onClick(); }} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", background: "none", border: "none", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", color, fontSize: "0.82rem", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>{icon} {texto}</button>
    );

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 14px", borderBottom: `1px solid ${C.surfaceContainerHigh}`, position: "relative" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: tx.type === "ingreso" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: tx.type === "ingreso" ? C.verde : C.rojo, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {tx.type === "ingreso" ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.text}</div>
                <div style={{ fontSize: "0.68rem", color: C.outline, display: "flex", alignItems: "center", gap: "6px", overflow: "hidden", whiteSpace: "nowrap" }}>
                    <span>{tx.date}</span>
                    {tx.category && <span>· {tx.category}</span>}
                    {account ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 700 }}>
                            · <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: account.color, display: "inline-block" }} />{account.name}
                        </span>
                    ) : (
                        <select
                            value="" title="Este movimiento no sale de ninguna cuenta: elige una"
                            onChange={e => e.target.value && updateTransaction(tx.id, { accountId: Number(e.target.value) })}
                            style={{ border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.06)", color: C.rojo, borderRadius: "999px", padding: "1px 8px", fontSize: "0.66rem", fontWeight: 800, cursor: "pointer", outline: "none", maxWidth: "150px" }}
                        >
                            <option value="">Asignar cuenta ▾</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    )}
                </div>
            </div>
            <span style={{ fontWeight: 800, fontSize: "0.92rem", whiteSpace: "nowrap", color: tx.type === "ingreso" ? C.verde : C.rojo }}>
                {tx.type === "ingreso" ? "+" : "−"}S/ {monto}
            </span>
            <div style={{ position: "relative", flexShrink: 0 }}>
                <button onClick={() => setMenuOpen(v => !v)} title="Más opciones" style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}><MoreVertical size={17} /></button>
                {menuOpen && (
                    <>
                        <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
                        <div style={{ position: "absolute", top: "34px", right: 0, zIndex: 21, background: "white", border: `1px solid ${C.outlineVariant}`, borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "4px", minWidth: "170px" }}>
                            {menuItem(<Edit2 size={15} />, "Editar", () => setIsEditing(true))}
                            {esPagoFijo && menuItem(<Undo2 size={15} />, "Deshacer pago", () => setConfirmUndo(true))}
                            {menuItem(<Trash2 size={15} />, "Eliminar", () => setConfirmDelete(true), C.rojo)}
                        </div>
                    </>
                )}
            </div>

            <ConfirmDialog
                open={confirmUndo}
                title="Deshacer pago"
                message={`Se anula "${tx.text}" (S/ ${monto}): la plata vuelve a la cuenta y el gasto fijo queda pendiente otra vez.`}
                confirmLabel="Deshacer pago"
                cancelLabel="Cancelar"
                onConfirm={() => { undoFixedExpensePayment?.(tx.id); setConfirmUndo(false); }}
                onCancel={() => setConfirmUndo(false)}
            />
            <ConfirmDialog
                open={confirmDelete}
                title="Eliminar movimiento"
                message={`¿Eliminar "${tx.text}" por S/ ${monto}? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { removeTransaction(tx.id); setConfirmDelete(false); }}
                onCancel={() => setConfirmDelete(false)}
            />
        </div>
    );
};
