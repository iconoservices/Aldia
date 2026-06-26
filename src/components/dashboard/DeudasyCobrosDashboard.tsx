import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Transaction } from "../../hooks/useAlDiaState";

interface DeudasyCobrosDashboardProps {
    transactions: Transaction[];
    addTransaction: (
        text: string, amount: number, type: "ingreso" | "gasto",
        isDebt: boolean, projectId?: number, accountId?: number,
        isCashless?: boolean, category?: string, contact?: string
    ) => void;
    removeTransaction: (id: number) => void;
    repayDebt: (originalTx: Transaction, amount: number, accountId: number) => void;
    accounts: { id: number; name: string; color: string }[];
}

type FilterType = "todos" | "deuda" | "cobro";
type FilterEstado = "todos" | "vencido" | "proximo" | "pendiente" | "confirmado" | "atrasado" | "programado";

const getEstadoBadge = (tx: Transaction): { label: string; bg: string; text: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const txDate = tx.fullDate ? new Date(tx.fullDate + "T12:00:00") : null;

    if (!txDate) return { label: "Pendiente", bg: "#E2E8F0", text: "#475569" };

    const diffDays = Math.ceil((txDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (tx.type === "gasto") {
        if (diffDays < 0) return { label: "Vencido", bg: "#FFDAD6", text: "#93000A" };
        if (diffDays <= 5) return { label: "PrÃ³ximo", bg: "#FFB786", text: "#6E2C00" };
        return { label: "Pendiente", bg: "#E2E8F0", text: "#475569" };
    } else {
        if (diffDays < 0) return { label: "Atrasado", bg: "#FFDAD6", text: "#93000A" };
        if (diffDays <= 5) return { label: "PrÃ³ximo", bg: "#FFB786", text: "#6E2C00" };
        if (diffDays <= 15) return { label: "Confirmado", bg: "#D1FAE5", text: "#065F46" };
        return { label: "Programado", bg: "#E2E8F0", text: "#475569" };
    }
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return "â€”";
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};

const formatCurrency = (amount: number) =>
    "S/ " + Math.abs(amount).toLocaleString("en-US", { minimumFractionDigits: 2 });

const getContactIcon = (contact?: string, type?: string) => {
    if (!contact) return type === "gasto" ? "account_balance" : "business";
    const lower = contact.toLowerCase();
    if (lower.includes("banco") || lower.includes("tarjeta") || lower.includes("visa") || lower.includes("credito")) return "credit_card";
    if (lower.includes("electric") || lower.includes("agua") || lower.includes("luz") || lower.includes("servicio")) return "electric_bolt";
    if (lower.includes("prestamo") || lower.includes("julia") || lower.includes("pedro") || lower.includes("maria") || lower.includes("carlos")) return "person";
    if (lower.includes("tech") || lower.includes("solutions") || lower.includes("inc") || lower.includes("corp") || lower.includes("ltda")) return "business";
    if (lower.includes("venta") || lower.includes("activo") || lower.includes("store") || lower.includes("tienda")) return "storefront";
    return type === "gasto" ? "account_balance" : "business";
};

const getIconColor = (badge: { label: string }) => {
    if (badge.label === "Vencido" || badge.label === "Atrasado") return { bg: "rgba(186,26,26,0.1)", color: "#BA1A1A" };
    if (badge.label === "PrÃ³ximo") return { bg: "rgba(146,71,0,0.1)", color: "#924700" };
    if (badge.label === "Confirmado") return { bg: "rgba(16,185,129,0.1)", color: "#10B981" };
    return { bg: "#DAE2FD", color: "#565E74" };
};

const CARD: React.CSSProperties = {
    background: "#fff",
    borderRadius: "12px",
    boxShadow: "0px 4px 12px rgba(15,23,24,0.05)",
    overflow: "hidden",
};

const TH: React.CSSProperties = {
    padding: "14px 16px",
    fontSize: "0.68rem",
    fontWeight: 800,
    color: "#424754",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    textAlign: "left",
};

const TD: React.CSSProperties = {
    padding: "14px 16px",
    fontSize: "0.88rem",
    color: "#191B23",
    borderBottom: "1px solid #E6E7F2",
};

const BTN_PRIMARY: React.CSSProperties = {
    padding: "10px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#0058BE",
    color: "#fff",
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 12px rgba(0,88,190,0.25)",
};

const BTN_SECONDARY: React.CSSProperties = {
    padding: "10px 18px",
    border: "1px solid #C2C6D6",
    borderRadius: "8px",
    background: "#fff",
    color: "#191B23",
    fontFamily: "'Inter', sans-serif",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
};

export const DeudasyCobrosDashboard = ({
    transactions,
    addTransaction,
    removeTransaction,
}: DeudasyCobrosDashboardProps) => {
    const [filterType, setFilterType] = useState<FilterType>("todos");
    const [filterEstado, setFilterEstado] = useState<FilterEstado>("todos");
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [showAddModal, setShowAddModal] = useState(false);
    const [newType, setNewType] = useState<"gasto" | "ingreso">("gasto");
    const [newText, setNewText] = useState("");
    const [newContact, setNewContact] = useState("");
    const [newAmount, setNewAmount] = useState("");
    const [confirmPayId, setConfirmPayId] = useState<number | null>(null);
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [abonarId, setAbonarId] = useState<number | null>(null);
    const [abonarAmount, setAbonarAmount] = useState<Record<number, string>>({});

    const handleAbonar = (tx: Transaction, amount: number) => {
        if (amount <= 0) return;
        addTransaction(
            `Pago: ${tx.text}`,
            tx.type === "gasto" ? amount : -amount,
            tx.type === "gasto" ? "ingreso" : "gasto",
            true,
            undefined,
            undefined,
            true,
            "Deudas",
            tx.contact
        );
        setAbonarId(null);
        setAbonarAmount(m => ({ ...m, [tx.id]: "" }));
    };

    const handleEdit = (tx: Transaction) => {
        setEditingTx(tx);
        setNewText(tx.text);
        setNewContact(tx.contact || "");
        setNewAmount(String(Math.abs(tx.amount)));
        setNewType(tx.type);
        setShowAddModal(true);
    };

    const handleSaveEdit = () => {
        if (!editingTx) return;
        const newAmountNum = parseFloat(newAmount);
        if (!newText.trim() || isNaN(newAmountNum) || newAmountNum <= 0) return;
        // Eliminar la transacción original y crear la nueva con datos editados
        removeTransaction(editingTx.id);
        addTransaction(
            newText.trim(),
            newType === "gasto" ? -newAmountNum : newAmountNum,
            newType,
            true,
            undefined,
            undefined,
            false,
            "Deudas",
            newContact.trim() || undefined
        );
        setEditingTx(null);
        setShowAddModal(false);
        setNewText("");
        setNewContact("");
        setNewAmount("");
    };

    const handleDelete = (tx: Transaction) => {
        if (confirm(`¿Eliminar esta ${tx.type === "gasto" ? "deuda" : "cobro"} de S/ ${Math.abs(tx.amount).toFixed(2)}?`)) {
            removeTransaction(tx.id);
        }
    };

    const debtTxs = useMemo(() =>
        transactions.filter(t => t.isDebt && t.type === "gasto"),
        [transactions]);

    const cobroTxs = useMemo(() =>
        transactions.filter(t => t.isDebt && t.type === "ingreso"),
        [transactions]);

    const totalPagar = useMemo(() =>
        debtTxs.reduce((s, t) => s + Math.abs(t.amount), 0), [debtTxs]);

    const totalCobrar = useMemo(() =>
        cobroTxs.reduce((s, t) => s + Math.abs(t.amount), 0), [cobroTxs]);

    const balanceNeto = totalCobrar - totalPagar;

    const filteredDebts = useMemo(() => {
        if (filterEstado === "todos") return debtTxs;
        return debtTxs.filter(t => getEstadoBadge(t).label.toLowerCase() === filterEstado);
    }, [debtTxs, filterEstado]);

    const filteredCobros = useMemo(() => {
        if (filterEstado === "todos") return cobroTxs;
        return cobroTxs.filter(t => getEstadoBadge(t).label.toLowerCase() === filterEstado);
    }, [cobroTxs, filterEstado]);

    const handleAdd = () => {
        if (!newText.trim() || !newAmount) return;
        const amt = parseFloat(newAmount);
        if (isNaN(amt) || amt <= 0) return;
        addTransaction(
            newText.trim(),
            newType === "gasto" ? -amt : amt,
            newType,
            true,
            undefined,
            undefined,
            false,
            undefined,
            newContact.trim() || undefined
        );
        setNewText(""); setNewContact(""); setNewAmount("");
        setShowAddModal(false);
    };

    const handleMarkPaid = (tx: Transaction) => {
        removeTransaction(tx.id);
        setConfirmPayId(null);
    };

    const renderDebtTable = (items: Transaction[]) => (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
<thead>
                    <tr style={{ background: "#F2F3FD", borderBottom: "1px solid #C2C6D6" }}>
                        <th style={TH}>Acreedor</th>
                        <th style={TH}>Monto</th>
                        <th style={TH}>Fecha</th>
                        <th style={TH}>Estado</th>
                        <th style={TH}>Acciones</th>
                    </tr>
                </thead>
<tbody>
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={5} style={{ ...TD, textAlign: "center", color: "#727785", padding: "2.5rem", borderBottom: "none" }}>
                                Sin deudas registradas 🎉
                            </td>
                        </tr>
                    )}
                    {items.map(tx => {
                        const badge = getEstadoBadge(tx);
                        const iconC = getIconColor(badge);
                        const icon = getContactIcon(tx.contact || tx.text, "gasto");
                        return (
                            <tr
                                key={tx.id}
                                style={{ transition: "background 0.15s" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#F2F3FD")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                                <td style={TD}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: iconC.bg, color: iconC.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>{icon}</span>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{tx.contact || tx.text}</div>
                                            {tx.contact && <div style={{ fontSize: "0.72rem", color: "#727785" }}>{tx.text}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td style={{ ...TD, fontWeight: 700, color: "#BA1A1A", fontVariantNumeric: "tabular-nums" }}>
                                    {formatCurrency(tx.amount)}
                                </td>
                                <td style={{ ...TD, color: "#424754", fontSize: "0.82rem" }}>{formatDate(tx.fullDate)}</td>
                                <td style={TD}>
                                    <span style={{ padding: "3px 10px", borderRadius: "999px", background: badge.bg, color: badge.text, fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                                        {badge.label}
                                    </span>
                                </td>
                                <td style={TD}>
                                    <div style={{ display: "flex", gap: "4px" }}>
                                        {abonarId === tx.id ? (
                                            <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                                                <input type="number" value={abonarAmount[tx.id] ?? Math.abs(tx.amount).toFixed(2)} onChange={e => setAbonarAmount(m => ({ ...m, [tx.id]: e.target.value }))}
                                                    style={{ width: "60px", padding: "2px 4px", borderRadius: "4px", border: "1px solid #E2E8F0", fontSize: "0.65rem", fontWeight: 700, outline: "none" }} />
                                                <button onClick={() => handleAbonar(tx, parseFloat(abonarAmount[tx.id] || String(Math.abs(tx.amount))))} style={{ background: "#10B981", color: "white", border: "none", borderRadius: "4px", padding: "2px 5px", fontWeight: 800, fontSize: "0.6rem", cursor: "pointer" }}>Abonar</button>
                                                <button onClick={() => handleAbonar(tx, Math.abs(tx.amount))} style={{ background: "#059669", color: "white", border: "none", borderRadius: "4px", padding: "2px 5px", fontWeight: 800, fontSize: "0.6rem", cursor: "pointer" }}>Todo</button>
                                                <button onClick={() => { setAbonarId(null); setAbonarAmount(m => ({ ...m, [tx.id]: "" })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "2px", fontSize: "0.7rem", fontWeight: 800 }}>X</button>
                                            </div>
                                        ) : (
                                            <>
                                                <button onClick={() => { setAbonarId(tx.id); setAbonarAmount(m => ({ ...m, [tx.id]: String(Math.abs(tx.amount)) })); }} title="Abonar" style={{ background: "#E2E8F0", border: "none", borderRadius: "4px", padding: "2px 6px", fontWeight: 700, fontSize: "0.6rem", cursor: "pointer", color: "#475569" }}>Abonar</button>
                                                <button onClick={() => handleEdit(tx)} title="Editar" style={{ background: "none", border: "1px solid #0058BE", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#0058BE" }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: "14px", verticalAlign: "middle" }}>edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(tx)} title="Eliminar" style={{ background: "none", border: "1px solid #BA1A1A", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#BA1A1A" }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: "14px", verticalAlign: "middle" }}>delete</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderCobroTable = (items: Transaction[]) => (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ background: "#F2F3FD", borderBottom: "1px solid #C2C6D6" }}>
                        <th style={TH}>Deudor</th>
                        <th style={TH}>Monto</th>
                        <th style={TH}>Fecha Est.</th>
                        <th style={TH}>Estado</th>
                        <th style={TH}></th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 && (
                        <tr>
                            <td colSpan={5} style={{ ...TD, textAlign: "center", color: "#727785", padding: "2.5rem", borderBottom: "none" }}>
                                Sin cobros registrados
                            </td>
                        </tr>
                    )}
                    {items.map(tx => {
                        const badge = getEstadoBadge(tx);
                        const iconC = getIconColor(badge);
                        const icon = getContactIcon(tx.contact || tx.text, "ingreso");
                        return (
                            <tr
                                key={tx.id}
                                style={{ transition: "background 0.15s" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#F2F3FD")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                                <td style={TD}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: iconC.bg, color: iconC.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>{icon}</span>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{tx.contact || tx.text}</div>
                                            {tx.contact && <div style={{ fontSize: "0.72rem", color: "#727785" }}>{tx.text}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td style={{ ...TD, fontWeight: 700, color: "#10B981", fontVariantNumeric: "tabular-nums" }}>
                                    {formatCurrency(tx.amount)}
                                </td>
                                <td style={{ ...TD, color: "#424754", fontSize: "0.82rem" }}>{formatDate(tx.fullDate)}</td>
                                <td style={TD}>
                                    <span style={{ padding: "3px 10px", borderRadius: "999px", background: badge.bg, color: badge.text, fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                                        {badge.label}
                                    </span>
                                </td>
<td style={TD}>
                                    {confirmPayId === tx.id ? (
                                        <div style={{ display: "flex", gap: "4px" }}>
                                            <button onClick={() => handleMarkPaid(tx)} style={{ ...BTN_PRIMARY, padding: "4px 10px", fontSize: "0.72rem", boxShadow: "none" }}>✓ Confirmar</button>
                                            <button onClick={() => setConfirmPayId(null)} style={{ ...BTN_SECONDARY, padding: "4px 10px", fontSize: "0.72rem" }}>✗</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                            {abonarId === tx.id ? (
                                                <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                                                    <input type="number" value={abonarAmount[tx.id] ?? Math.abs(tx.amount).toFixed(2)} onChange={e => setAbonarAmount(m => ({ ...m, [tx.id]: e.target.value }))}
                                                        style={{ width: "60px", padding: "2px 4px", borderRadius: "4px", border: "1px solid #E2E8F0", fontSize: "0.65rem", fontWeight: 700, outline: "none" }} />
                                                    <button onClick={() => handleAbonar(tx, parseFloat(abonarAmount[tx.id] || String(Math.abs(tx.amount))))} style={{ background: "#10B981", color: "white", border: "none", borderRadius: "4px", padding: "2px 5px", fontWeight: 800, fontSize: "0.6rem", cursor: "pointer" }}>Cobrar</button>
                                                    <button onClick={() => handleAbonar(tx, Math.abs(tx.amount))} style={{ background: "#059669", color: "white", border: "none", borderRadius: "4px", padding: "2px 5px", fontWeight: 800, fontSize: "0.6rem", cursor: "pointer" }}>Todo</button>
                                                    <button onClick={() => { setAbonarId(null); setAbonarAmount(m => ({ ...m, [tx.id]: "" })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "2px", fontSize: "0.7rem", fontWeight: 800 }}>X</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button onClick={() => { setAbonarId(tx.id); setAbonarAmount(m => ({ ...m, [tx.id]: String(Math.abs(tx.amount)) })); }} title="Cobrar" style={{ background: "#E2E8F0", border: "none", borderRadius: "4px", padding: "2px 6px", fontWeight: 700, fontSize: "0.6rem", cursor: "pointer", color: "#475569" }}>Cobrar</button>
                                                    <button onClick={() => handleEdit(tx)} title="Editar" style={{ background: "none", border: "1px solid #0058BE", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#0058BE" }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: "14px", verticalAlign: "middle" }}>edit</span>
                                                    </button>
                                                    <button onClick={() => handleDelete(tx)} title="Eliminar" style={{ background: "none", border: "1px solid #BA1A1A", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#BA1A1A" }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: "14px", verticalAlign: "middle" }}>delete</span>
                                                    </button>
                                                    <button onClick={() => setConfirmPayId(tx.id)} title="Marcar como cobrado" style={{ background: "none", border: "1px solid #C2C6D6", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#424754" }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: "14px", verticalAlign: "middle" }}>check_circle</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100%", paddingBottom: "3rem", color: "#191B23" }}>

            {/* â”€â”€ HEADER â”€â”€ */}
            <div style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: "#191B23", lineHeight: 1.2 }}>
                            Deudas y Cobros Pendientes
                        </h2>
                        <p style={{ margin: "4px 0 0", fontSize: "0.88rem", color: "#424754" }}>
                            Gestione sus compromisos financieros y flujo de caja entrante.
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <button style={BTN_SECONDARY}>
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
                            Marcar como Pagado
                        </button>
                        <button style={BTN_PRIMARY} onClick={() => setShowAddModal(true)}>
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
                            Agregar Deuda/Cobro
                        </button>
                    </div>
                </div>

                {/* â”€â”€ SUMMARY CARDS â”€â”€ */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
                    {[
                        {
                            border: "#BA1A1A", label: "Total por Pagar", icon: "account_balance_wallet",
                            iconColor: "#BA1A1A", amount: totalPagar, amountColor: "#191B23",
                            sub: `${debtTxs.length} deuda${debtTxs.length !== 1 ? "s" : ""} pendiente${debtTxs.length !== 1 ? "s" : ""}`,
                            subIcon: "receipt_long", subColor: "#BA1A1A",
                        },
                        {
                            border: "#10B981", label: "Total por Cobrar", icon: "payments",
                            iconColor: "#10B981", amount: totalCobrar, amountColor: "#191B23",
                            sub: `${cobroTxs.length} cobro${cobroTxs.length !== 1 ? "s" : ""} activo${cobroTxs.length !== 1 ? "s" : ""}`,
                            subIcon: "trending_up", subColor: "#10B981",
                        },
                        {
                            border: "#0058BE", label: "Balance Neto", icon: "balance",
                            iconColor: "#0058BE", amount: balanceNeto, amountColor: balanceNeto >= 0 ? "#0058BE" : "#BA1A1A",
                            sub: balanceNeto >= 0 ? "SuperÃ¡vit neto" : "DÃ©ficit proyectado",
                            subIcon: balanceNeto >= 0 ? "check_circle" : "warning",
                            subColor: balanceNeto >= 0 ? "#10B981" : "#BA1A1A",
                        },
                    ].map((c, i) => (
                        <div key={i} style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", borderLeft: `4px solid ${c.border}`, boxShadow: "0px 4px 12px rgba(15,23,24,0.05)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                                <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#424754", textTransform: "uppercase", letterSpacing: "0.07em" }}>{c.label}</span>
                                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: c.iconColor, opacity: 0.4 }}>{c.icon}</span>
                            </div>
                            <div style={{ fontSize: "1.7rem", fontWeight: 700, color: c.amountColor, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                                {c.amount < 0 ? "-" : ""}{formatCurrency(Math.abs(c.amount))}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px", color: c.subColor, fontSize: "0.78rem", fontWeight: 600 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{c.subIcon}</span>
                                {c.sub}
                            </div>
                        </div>
                    ))}
                </div>

                {/* â”€â”€ FILTER BAR â”€â”€ */}
                <div style={{ background: "#ECEDF7", borderRadius: "12px", padding: "1rem 1.25rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", border: "1px solid #C2C6D6" }}>
                    <span style={{ fontSize: "0.78rem", color: "#424754", fontWeight: 600 }}>Filtrar por:</span>
                    <select value={filterType} onChange={e => setFilterType(e.target.value as FilterType)}
                        style={{ background: "#fff", border: "1px solid #C2C6D6", borderRadius: "8px", padding: "6px 10px", fontSize: "0.82rem", fontFamily: "'Inter',sans-serif", color: "#191B23", cursor: "pointer" }}>
                        <option value="todos">Todos los Tipos</option>
                        <option value="deuda">Solo Deudas</option>
                        <option value="cobro">Solo Cobros</option>
                    </select>
                    <select value={filterEstado} onChange={e => setFilterEstado(e.target.value as FilterEstado)}
                        style={{ background: "#fff", border: "1px solid #C2C6D6", borderRadius: "8px", padding: "6px 10px", fontSize: "0.82rem", fontFamily: "'Inter',sans-serif", color: "#191B23", cursor: "pointer" }}>
                        <option value="todos">Todos los Estados</option>
                        <option value="vencido">Vencido</option>
                        <option value="proximo">PrÃ³ximo</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="atrasado">Atrasado</option>
                        <option value="programado">Programado</option>
                    </select>
                    <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                        {(["grid", "list"] as const).map(m => (
                            <button key={m} onClick={() => setViewMode(m)} style={{ padding: "6px 10px", borderRadius: "8px", border: "none", background: viewMode === m ? "#fff" : "transparent", boxShadow: viewMode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none", cursor: "pointer", color: viewMode === m ? "#0058BE" : "#424754" }}>
                                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{m === "grid" ? "grid_view" : "list"}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* â”€â”€ TABLES â”€â”€ */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "2rem" }}>
                {filterType !== "cobro" && (
                    <section style={CARD}>
                        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #C2C6D6", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F2F3FD" }}>
                            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#191B23", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="material-symbols-outlined" style={{ color: "#BA1A1A", fontSize: "20px" }}>outbox</span>
                                Deudas (Cuentas por Pagar)
                            </h3>
                            <button style={{ background: "none", border: "none", color: "#0058BE", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Ver todo</button>
                        </div>
                        {renderDebtTable(filteredDebts)}
                    </section>
                )}

                {filterType !== "deuda" && (
                    <section style={CARD}>
                        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #C2C6D6", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F2F3FD" }}>
                            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#191B23", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="material-symbols-outlined" style={{ color: "#10B981", fontSize: "20px" }}>move_to_inbox</span>
                                Cobros (Cuentas por Cobrar)
                            </h3>
                            <button style={{ background: "none", border: "none", color: "#0058BE", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Ver todo</button>
                        </div>
                        {renderCobroTable(filteredCobros)}
                    </section>
                )}
            </div>

            {/* â”€â”€ ADD MODAL â”€â”€ */}
            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: "fixed", inset: 0, background: "rgba(25,27,35,0.45)", backdropFilter: "blur(4px)", zIndex: 200 }}
                            onClick={() => setShowAddModal(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", stiffness: 380, damping: 28 }}
                            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#fff", borderRadius: "16px", padding: "2rem", zIndex: 201, width: "min(480px, 90vw)", boxShadow: "0px 12px 24px rgba(15,23,42,0.12)" }}
                        >
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#191B23", fontFamily: "'Inter',sans-serif" }}>{editingTx ? "Editar Deuda / Cobro" : "Agregar Deuda / Cobro"}</h3>
                            <button onClick={() => { setShowAddModal(false); setEditingTx(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#727785", padding: "4px" }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                            <div style={{ display: "flex", gap: "8px", marginBottom: "1.25rem" }}>
                                {([
                                    { value: "gasto", label: "ðŸ’¸ Deuda (Debo)", activeColor: "#BA1A1A", activeBg: "#FFDAD6", activeText: "#93000A" },
                                    { value: "ingreso", label: "ðŸ’° Cobro (Me Deben)", activeColor: "#10B981", activeBg: "#D1FAE5", activeText: "#065F46" },
                                ] as const).map(opt => (
                                    <button key={opt.value} onClick={() => setNewType(opt.value)}
                                        style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `2px solid ${newType === opt.value ? opt.activeColor : "#C2C6D6"}`, background: newType === opt.value ? opt.activeBg : "#fff", color: newType === opt.value ? opt.activeText : "#424754", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.15s" }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {[
                                { label: newType === "gasto" ? "Acreedor / DescripciÃ³n" : "Deudor / DescripciÃ³n", value: newText, setter: setNewText, placeholder: "Ej: Banco Nacional, PrÃ©stamo..." },
                                { label: "Contacto (opcional)", value: newContact, setter: setNewContact, placeholder: "Ej: Carlos M., Tech Corp..." },
                                { label: "Monto (S/)", value: newAmount, setter: setNewAmount, placeholder: "0.00" },
                            ].map(field => (
                                <div key={field.label} style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#424754", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.04em", fontFamily: "'Inter',sans-serif" }}>
                                        {field.label}
                                    </label>
                                    <input
                                        type={field.label.includes("Monto") ? "number" : "text"}
                                        value={field.value}
                                        onChange={e => field.setter(e.target.value)}
                                        placeholder={field.placeholder}
                                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #C2C6D6", borderRadius: "8px", fontFamily: "'Inter',sans-serif", fontSize: "0.9rem", color: "#191B23", boxSizing: "border-box" as const, outline: "none" }}
                                        onFocus={e => (e.target.style.borderColor = "#0058BE")}
                                        onBlur={e => (e.target.style.borderColor = "#C2C6D6")}
                                    />
                                </div>
                            ))}

<div style={{ display: "flex", gap: "8px", marginTop: "1.5rem" }}>
                                <button onClick={() => { setShowAddModal(false); setEditingTx(null); }} style={{ ...BTN_SECONDARY, flex: 1, justifyContent: "center" }}>Cancelar</button>
                                <button onClick={editingTx ? handleSaveEdit : handleAdd} style={{ ...BTN_PRIMARY, flex: 1, justifyContent: "center" }}>{editingTx ? "Guardar Cambios" : "Guardar"}</button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

