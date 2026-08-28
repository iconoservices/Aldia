import { useState, useMemo } from "react";
import {
    TrendingUp, TrendingDown, Trash2, DollarSign, Edit2, MoreVertical,
    ChevronLeft, ChevronRight, Calendar, BarChart3, Search, X
} from "lucide-react";
import type { Transaction } from "../../hooks/useAlDiaState";
import { C, bento, etiqueta, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina } from "../../theme";
import {
    getPeriodBounds, periodLabel, shiftPeriod, PillToggle,
    type PeriodMode, type TxFilter,
} from "./FinanzasDashboard";
import { ConfirmDialog } from "../ui/ConfirmDialog";

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
    updateTransaction: (id: number, updates: Partial<Transaction>) => void;
    accounts: { id: number; name: string; color: string }[];
    incomeCategories?: string[];
    expenseCategories?: string[];
}

const txInputStyle: React.CSSProperties = { padding: "6px 8px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.78rem", outline: "none", background: "white", boxSizing: "border-box", width: "100%" };
const txLabelStyle: React.CSSProperties = { fontSize: "0.6rem", fontWeight: 800, color: C.outline, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "2px", display: "block" };

const CARD: React.CSSProperties = { ...bento, borderRadius: "10px", padding: "1.5rem" };
const LABEL: React.CSSProperties = etiqueta;

const fmt = (n: number) => Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

// Panel de resumen (Entró / Salió): un total grande arriba y el desglose por
// balde debajo. Las filas en cero no se muestran.
const ResumenPanel = ({ titulo, total, color, filas }: {
    titulo: string;
    total: number;
    color: string;
    filas: { et: string; val: number; fuerte?: boolean; tenue?: boolean }[];
}) => {
    const visibles = filas.filter(f => f.val > 0);
    return (
        <div style={{ background: C.surface, borderRadius: "8px", padding: "12px 14px", border: `1px solid ${C.surfaceContainerLow}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                <span style={{ ...LABEL, color: C.outline }}>{titulo}</span>
                <span style={{ fontWeight: 900, fontSize: "1.05rem", color }}>S/ {fmt(total)}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {visibles.length === 0 && <span style={{ fontSize: "0.72rem", color: C.outline }}>Sin movimientos</span>}
                {visibles.map(f => (
                    <div key={f.et} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                        <span style={{ color: f.tenue ? C.outline : C.onSurfaceVariant, fontWeight: f.fuerte ? 800 : 600 }}>{f.et}</span>
                        <span style={{ color: f.tenue ? C.outline : C.onSurface, fontWeight: f.fuerte ? 800 : 700 }}>S/ {fmt(f.val)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MovimientosDashboard = ({ transactions, removeTransaction, updateTransaction, accounts, incomeCategories = [], expenseCategories = [] }: MovimientosProps) => {
    const movil = useIsMobile();
    const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
    const [periodRef, setPeriodRef] = useState<Date>(new Date());
    const [txFilter, setTxFilter] = useState<TxFilter>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [accountFilter, setAccountFilter] = useState<number | "all">("all");

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
        const q = searchQuery.trim().toLowerCase();
        if (q) list = list.filter(t => t.text.toLowerCase().includes(q) || t.contact?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q));
        return list;
    }, [periodTxs, txFilter, accountFilter, searchQuery]);

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
                        <BarChart3 size={18} color={C.secondary} />
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "1.2rem", background: C.surface, borderRadius: "8px", padding: "8px 16px" }}>
                        <button onClick={() => setPeriodRef(d => shiftPeriod(periodMode, d, -1))} style={{ background: "none", border: "none", cursor: "pointer", color: C.onSurfaceVariant, display: "flex", alignItems: "center", padding: "2px" }}><ChevronLeft size={18} /></button>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Calendar size={13} color={C.onSurfaceVariant} />
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, minWidth: "150px", textAlign: "center" }}>{periodLabel(periodMode, periodRef)}</span>
                        </div>
                        <button onClick={() => setPeriodRef(d => shiftPeriod(periodMode, d, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: C.onSurfaceVariant, display: "flex", alignItems: "center", padding: "2px" }}><ChevronRight size={18} /></button>
                    </div>
                )}

                {/* Resumen del período — cada movimiento en un solo balde */}
                <div style={{ display: "grid", gridTemplateColumns: movil ? "1fr" : "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <ResumenPanel
                        titulo="Entró"
                        total={periodStats.ingresoTotal}
                        color={C.verde}
                        filas={[
                            { et: "Generaste", val: periodStats.generado, fuerte: true },
                            { et: "Ayuda", val: periodStats.ayuda },
                            { et: "Cobro de deudas", val: periodStats.cobroDeuda, tenue: true },
                        ]}
                    />
                    <ResumenPanel
                        titulo="Salió"
                        total={periodStats.gastoTotal}
                        color={C.rojo}
                        filas={[
                            { et: "Gasto real", val: periodStats.gastoReal, fuerte: true },
                            { et: "Préstamos que diste", val: periodStats.prestamoDado, tenue: true },
                            { et: "Pago de deudas", val: periodStats.pagoDeuda, tenue: true },
                        ]}
                    />
                </div>

                {/* Neto real: lo que generaste + ayuda − consumo real */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: periodStats.netoReal >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                    border: `1px solid ${periodStats.netoReal >= 0 ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
                    borderRadius: "8px", padding: "10px 14px", marginBottom: "1.2rem", gap: "10px",
                }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ ...LABEL, color: periodStats.netoReal >= 0 ? C.verde : C.rojo }}>Neto real</div>
                        <div style={{ fontSize: "0.6rem", color: C.outline, fontWeight: 600, marginTop: "1px" }}>generaste + ayuda − gasto real</div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: "1.1rem", whiteSpace: "nowrap", flexShrink: 0, color: periodStats.netoReal >= 0 ? C.verde : C.rojo }}>
                        {periodStats.netoReal >= 0 ? "+" : "−"}S/ {fmt(periodStats.netoReal)}
                    </div>
                </div>

                {/* Search + account filter */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "0.85rem", flexWrap: "wrap" }}>
                    <div style={{ position: "relative", flex: movil ? "1 1 100%" : "1 1 220px", minWidth: 0 }}>
                        <Search size={14} color={C.outlineVariant} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
                        <input
                            placeholder="Buscar por texto, contacto o categoría..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ width: "100%", padding: "7px 30px 7px 30px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", display: "flex" }}><X size={13} /></button>
                        )}
                    </div>
                    {accounts.length > 0 && (
                        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value === "all" ? "all" : Number(e.target.value))} style={{ padding: "7px 9px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.78rem", fontWeight: 700, background: "white", cursor: "pointer", flex: movil ? "1 1 100%" : undefined }}>
                            <option value="all">Todas las cuentas</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    )}
                </div>

                {/* Type filter */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "1rem", flexWrap: "wrap" }}>
                    {(["all", "ingreso", "gasto"] as TxFilter[]).map(f => (
                        <button key={f} onClick={() => setTxFilter(f)} style={{ padding: "4px 14px", borderRadius: "6px", border: `1px solid ${txFilter === f ? C.primary : C.outlineVariant}`, background: txFilter === f ? C.primary : "transparent", color: txFilter === f ? "white" : C.onSurfaceVariant, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                            {f === "all" ? "Todos" : f === "ingreso" ? "Ingresos" : "Gastos"}
                        </button>
                    ))}
                    <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: C.outline, fontWeight: 600, alignSelf: "center" }}>{filteredTxs.length} movimientos</span>
                </div>

                {/* Transaction list */}
                {filteredTxs.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2.5rem 0", gap: "8px", color: C.outlineVariant }}>
                        <DollarSign size={32} strokeWidth={1.5} />
                        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Sin movimientos en este período</span>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                        {filteredTxs.map(tx => (
                            <MovimientoRow key={tx.id} tx={tx} accountById={accountById} accounts={accounts} removeTransaction={removeTransaction} updateTransaction={updateTransaction} incomeCategories={incomeCategories} expenseCategories={expenseCategories} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Movimiento row ────────────────────────────────────────────────────────────
const MovimientoRow = ({ tx, accountById, accounts, removeTransaction, updateTransaction, incomeCategories = [], expenseCategories = [] }: {
    tx: Transaction;
    accountById: Map<number, { id: number; name: string; color: string }>;
    accounts: { id: number; name: string; color: string }[];
    removeTransaction: (id: number) => void;
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

    const categoriasDisponibles = tx.type === "ingreso" ? incomeCategories : expenseCategories;

    const save = () => {
        const value = Math.abs(Number(editAmount)) || 0;
        updateTransaction(tx.id, { text: editText, amount: tx.type === "ingreso" ? value : -value, accountId: editAccountId, category: editCategory || undefined });
        setIsEditing(false);
    };

    if (isEditing) return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px 12px", borderRadius: "8px", background: C.surface, border: `1px solid ${C.outlineVariant}` }}>
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
                <button onClick={() => setIsEditing(false)} style={{ background: "none", border: `1px solid ${C.outlineVariant}`, color: C.onSurfaceVariant, borderRadius: "8px", padding: "6px 12px", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>Cancelar</button>
                <button onClick={save} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "8px", padding: "6px 12px", fontWeight: 800, fontSize: "0.75rem", cursor: "pointer" }}>Guardar</button>
            </div>
        </div>
    );

    // Franja de color a la izquierda con el color de la cuenta — para distinguir
    // de un vistazo, sin texto extra, de qué cuenta es cada movimiento cuando la
    // lista mezcla varias cuentas (el tag con el nombre ya existía pero se pierde
    // entre el resto del texto chico).
    const accountColor = tx.accountId ? accountById.get(tx.accountId)?.color : undefined;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "8px", background: C.surface, border: `1px solid ${C.surfaceContainerLow}`, borderLeft: `3px solid ${accountColor || C.outlineVariant}` }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: tx.type === "ingreso" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: tx.type === "ingreso" ? C.verde : C.rojo, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {tx.type === "ingreso" ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.83rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.text}</div>
                <div style={{ fontSize: "0.62rem", color: C.outline, display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                    {tx.fullDate} · {tx.date}
                    {tx.category && <span style={{ background: C.surfaceContainerLow, padding: "1px 6px", borderRadius: "6px", color: C.onSurfaceVariant, fontWeight: 700 }}>{tx.category}</span>}
                    {tx.accountId && accountById.get(tx.accountId) ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", background: C.surfaceContainerLow, padding: "1px 6px", borderRadius: "6px", color: C.onSurfaceVariant, fontWeight: 700 }}>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: accountColor, display: "inline-block" }} />
                            {accountById.get(tx.accountId)!.name}
                        </span>
                    ) : (
                        <span style={{ background: "rgba(239,68,68,0.1)", padding: "1px 6px", borderRadius: "6px", color: C.rojo, fontWeight: 700 }}>sin cuenta</span>
                    )}
                </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, position: "relative" }}>
                <span style={{ fontWeight: 800, fontSize: "0.88rem", color: tx.type === "ingreso" ? C.verde : C.rojo }}>
                    {tx.type === "ingreso" ? "+" : "-"}S/ {Math.abs(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <button onClick={() => setMenuOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.outlineVariant, padding: "2px", display: "flex" }}><MoreVertical size={14} /></button>

                {menuOpen && (
                    <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 5, background: "white", border: `1px solid ${C.outlineVariant}`, borderRadius: "8px", boxShadow: "0 4px 14px rgba(0,0,0,0.1)", overflow: "hidden", minWidth: "120px" }}>
                        <button onClick={() => { setIsEditing(true); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.onSurface, fontSize: "0.78rem", fontWeight: 600, textAlign: "left" }}><Edit2 size={13} /> Editar</button>
                        <button onClick={() => { setConfirmDelete(true); setMenuOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%", background: "none", border: "none", padding: "9px 12px", cursor: "pointer", color: C.rojo, fontSize: "0.78rem", fontWeight: 600, textAlign: "left", borderTop: `1px solid ${C.surfaceContainerLow}` }}><Trash2 size={13} /> Eliminar</button>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={confirmDelete}
                title="Eliminar movimiento"
                message={`¿Eliminar "${tx.text}" por S/ ${Math.abs(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { removeTransaction(tx.id); setConfirmDelete(false); }}
                onCancel={() => setConfirmDelete(false)}
            />
        </div>
    );
};
