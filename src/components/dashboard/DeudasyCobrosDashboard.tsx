import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Transaction } from "../../hooks/useAlDiaState";
import { useIsMobile } from "../../theme";

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

// Antes registrar una deuda no tocaba ninguna cuenta: si te prestaban plata, "Debo"
// subía pero tu liquidez (Mis Cuentas) se quedaba igual, como si el efectivo no
// hubiera llegado. Al elegir una cuenta acá se crea una SEGUNDA transacción real
// (isDebt: false, si ligada a cuenta) que sí mueve el efectivo, sin tocar el cálculo
// de "Debo/Me deben" que ya vive en la transacción de seguimiento original.

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
        if (diffDays <= 5) return { label: "Próximo", bg: "#FFB786", text: "#6E2C00" };
        return { label: "Pendiente", bg: "#E2E8F0", text: "#475569" };
    } else {
        if (diffDays < 0) return { label: "Atrasado", bg: "#FFDAD6", text: "#93000A" };
        if (diffDays <= 5) return { label: "Próximo", bg: "#FFB786", text: "#6E2C00" };
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
    if (badge.label === "Próximo") return { bg: "rgba(146,71,0,0.1)", color: "#924700" };
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
    accounts,
}: DeudasyCobrosDashboardProps) => {
    const movil = useIsMobile();
    const [filterType, setFilterType] = useState<FilterType>("todos");
    const [filterEstado, setFilterEstado] = useState<FilterEstado>("todos");
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [showAddModal, setShowAddModal] = useState(false);
    const [newType, setNewType] = useState<"gasto" | "ingreso">("gasto");
    const [newText, setNewText] = useState("");
    const [newContact, setNewContact] = useState("");
    const [newAmount, setNewAmount] = useState("");
    const [newAccountId, setNewAccountId] = useState<string>("");
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
        setNewAccountId("");
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
            // Si esta deuda va a mover efectivo de verdad (hay cuenta elegida), esta mitad
            // pasa a isCashless: el movimiento de caja ya lo cuenta la transacción real de
            // abajo, y contar los dos aquí duplicaba el impacto en Balance/Patrimonio Neto.
            !!newAccountId,
            undefined,
            newContact.trim() || undefined
        );
        // Si se eligió cuenta, el efectivo también se mueve de verdad:
        // "Debo" (gasto) = me prestaron, entra plata a la cuenta.
        // "Me deben" (ingreso) = yo presté, sale plata de la cuenta.
        if (newAccountId) {
            addTransaction(
                newType === "gasto" ? `Préstamo recibido: ${newText.trim()}` : `Préstamo entregado: ${newText.trim()}`,
                amt,
                newType === "gasto" ? "ingreso" : "gasto",
                false,
                undefined,
                Number(newAccountId),
                false,
                "Préstamos",
                newContact.trim() || undefined
            );
        }
        setNewText(""); setNewContact(""); setNewAmount(""); setNewAccountId("");
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

    // Vista móvil: la tabla de 5 columnas no entra en una pantalla angosta,
    // así que cada fila se convierte en una tarjeta apilada (mismo dato, otro layout).
    const renderDebtCards = (items: Transaction[]) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.75rem" }}>
            {items.length === 0 && (
                <p style={{ textAlign: "center", color: "#727785", padding: "2rem 0", margin: 0, fontSize: "0.85rem" }}>Sin deudas registradas 🎉</p>
            )}
            {items.map(tx => {
                const badge = getEstadoBadge(tx);
                const iconC = getIconColor(badge);
                const icon = getContactIcon(tx.contact || tx.text, "gasto");
                return (
                    <div key={tx.id} style={{ background: "#fff", border: "1px solid #E6E7F2", borderRadius: "12px", padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: iconC.bg, color: iconC.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{icon}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.contact || tx.text}</div>
                                {tx.contact && <div style={{ fontSize: "0.66rem", color: "#727785", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.text}</div>}
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontWeight: 700, color: "#BA1A1A", fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(tx.amount)}</div>
                                <div style={{ fontSize: "0.6rem", color: "#424754" }}>{formatDate(tx.fullDate)}</div>
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", gap: "6px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: "999px", background: badge.bg, color: badge.text, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em", flexShrink: 0 }}>
                                {badge.label}
                            </span>
                            {abonarId === tx.id ? (
                                <div style={{ display: "flex", gap: "3px", alignItems: "center", flex: 1, justifyContent: "flex-end" }}>
                                    <input type="number" value={abonarAmount[tx.id] ?? Math.abs(tx.amount).toFixed(2)} onChange={e => setAbonarAmount(m => ({ ...m, [tx.id]: e.target.value }))}
                                        style={{ width: "56px", padding: "3px 5px", borderRadius: "4px", border: "1px solid #E2E8F0", fontSize: "0.68rem", fontWeight: 700, outline: "none" }} />
                                    <button onClick={() => handleAbonar(tx, parseFloat(abonarAmount[tx.id] || String(Math.abs(tx.amount))))} style={{ background: "#10B981", color: "white", border: "none", borderRadius: "4px", padding: "4px 6px", fontWeight: 800, fontSize: "0.62rem", cursor: "pointer" }}>Abonar</button>
                                    <button onClick={() => { setAbonarId(null); setAbonarAmount(m => ({ ...m, [tx.id]: "" })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "3px", fontSize: "0.75rem", fontWeight: 800 }}>X</button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", gap: "4px" }}>
                                    <button onClick={() => { setAbonarId(tx.id); setAbonarAmount(m => ({ ...m, [tx.id]: String(Math.abs(tx.amount)) })); }} title="Abonar" style={{ background: "#E2E8F0", border: "none", borderRadius: "4px", padding: "4px 7px", fontWeight: 700, fontSize: "0.62rem", cursor: "pointer", color: "#475569" }}>Abonar</button>
                                    <button onClick={() => handleEdit(tx)} title="Editar" style={{ background: "none", border: "1px solid #0058BE", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: "#0058BE", display: "flex" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(tx)} title="Eliminar" style={{ background: "none", border: "1px solid #BA1A1A", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: "#BA1A1A", display: "flex" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>delete</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderCobroCards = (items: Transaction[]) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.75rem" }}>
            {items.length === 0 && (
                <p style={{ textAlign: "center", color: "#727785", padding: "2rem 0", margin: 0, fontSize: "0.85rem" }}>Sin cobros registrados</p>
            )}
            {items.map(tx => {
                const badge = getEstadoBadge(tx);
                const iconC = getIconColor(badge);
                const icon = getContactIcon(tx.contact || tx.text, "ingreso");
                return (
                    <div key={tx.id} style={{ background: "#fff", border: "1px solid #E6E7F2", borderRadius: "12px", padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: iconC.bg, color: iconC.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{icon}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.contact || tx.text}</div>
                                {tx.contact && <div style={{ fontSize: "0.66rem", color: "#727785", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.text}</div>}
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontWeight: 700, color: "#10B981", fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(tx.amount)}</div>
                                <div style={{ fontSize: "0.6rem", color: "#424754" }}>{formatDate(tx.fullDate)}</div>
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ padding: "2px 8px", borderRadius: "999px", background: badge.bg, color: badge.text, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em", flexShrink: 0 }}>
                                {badge.label}
                            </span>
                            {confirmPayId === tx.id ? (
                                <div style={{ display: "flex", gap: "4px" }}>
                                    <button onClick={() => handleMarkPaid(tx)} style={{ ...BTN_PRIMARY, padding: "4px 10px", fontSize: "0.68rem", boxShadow: "none" }}>✓ Confirmar</button>
                                    <button onClick={() => setConfirmPayId(null)} style={{ ...BTN_SECONDARY, padding: "4px 10px", fontSize: "0.68rem" }}>✗</button>
                                </div>
                            ) : abonarId === tx.id ? (
                                <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                                    <input type="number" value={abonarAmount[tx.id] ?? Math.abs(tx.amount).toFixed(2)} onChange={e => setAbonarAmount(m => ({ ...m, [tx.id]: e.target.value }))}
                                        style={{ width: "56px", padding: "3px 5px", borderRadius: "4px", border: "1px solid #E2E8F0", fontSize: "0.68rem", fontWeight: 700, outline: "none" }} />
                                    <button onClick={() => handleAbonar(tx, parseFloat(abonarAmount[tx.id] || String(Math.abs(tx.amount))))} style={{ background: "#10B981", color: "white", border: "none", borderRadius: "4px", padding: "4px 6px", fontWeight: 800, fontSize: "0.62rem", cursor: "pointer" }}>Cobrar</button>
                                    <button onClick={() => { setAbonarId(null); setAbonarAmount(m => ({ ...m, [tx.id]: "" })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: "3px", fontSize: "0.75rem", fontWeight: 800 }}>X</button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", gap: "4px" }}>
                                    <button onClick={() => { setAbonarId(tx.id); setAbonarAmount(m => ({ ...m, [tx.id]: String(Math.abs(tx.amount)) })); }} title="Cobrar" style={{ background: "#E2E8F0", border: "none", borderRadius: "4px", padding: "4px 7px", fontWeight: 700, fontSize: "0.62rem", cursor: "pointer", color: "#475569" }}>Cobrar</button>
                                    <button onClick={() => handleEdit(tx)} title="Editar" style={{ background: "none", border: "1px solid #0058BE", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: "#0058BE", display: "flex" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(tx)} title="Eliminar" style={{ background: "none", border: "1px solid #BA1A1A", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: "#BA1A1A", display: "flex" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>delete</span>
                                    </button>
                                    <button onClick={() => setConfirmPayId(tx.id)} title="Marcar como cobrado" style={{ background: "none", border: "1px solid #C2C6D6", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: "#424754", display: "flex" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>check_circle</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100%", paddingBottom: "3rem", color: "#191B23" }}>

            {/* ── HEADER ── */}
            <div style={{ marginBottom: movil ? "1.25rem" : "2rem" }}>
                <div style={{ display: "flex", flexDirection: movil ? "column" : "row", justifyContent: "space-between", alignItems: movil ? "stretch" : "flex-end", flexWrap: "wrap", gap: movil ? "0.85rem" : "1rem", marginBottom: movil ? "1rem" : "1.5rem" }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: movil ? "1.2rem" : "1.6rem", fontWeight: 700, color: "#191B23", lineHeight: 1.2 }}>
                            Deudas y Cobros Pendientes
                        </h2>
                        <p style={{ margin: "4px 0 0", fontSize: movil ? "0.78rem" : "0.88rem", color: "#424754" }}>
                            Gestione sus compromisos financieros y flujo de caja entrante.
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                        <button style={movil ? { ...BTN_SECONDARY, flex: 1, justifyContent: "center", padding: "9px 12px", fontSize: "0.78rem" } : BTN_SECONDARY}>
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
                            {movil ? "Pagado" : "Marcar como Pagado"}
                        </button>
                        <button style={movil ? { ...BTN_PRIMARY, flex: 1, justifyContent: "center", padding: "9px 12px", fontSize: "0.78rem" } : BTN_PRIMARY} onClick={() => setShowAddModal(true)}>
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
                            {movil ? "Agregar" : "Agregar Deuda/Cobro"}
                        </button>
                    </div>
                </div>

                {/* ── SUMMARY CARDS ── */}
                <div style={{ display: "grid", gridTemplateColumns: movil ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(200px, 1fr))", gap: movil ? "0.6rem" : "1.25rem", marginBottom: movil ? "0.85rem" : "1.25rem" }}>
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
                            sub: balanceNeto >= 0 ? "Superávit neto" : "Déficit proyectado",
                            subIcon: balanceNeto >= 0 ? "check_circle" : "warning",
                            subColor: balanceNeto >= 0 ? "#10B981" : "#BA1A1A",
                        },
                    ].map((c, i) => (
                        <div key={i} style={{ background: "#fff", borderRadius: "12px", padding: movil ? "0.85rem" : "1.5rem", borderLeft: `4px solid ${c.border}`, boxShadow: "0px 4px 12px rgba(15,23,24,0.05)", gridColumn: (movil && i === 2) ? "1 / -1" : undefined }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: movil ? "0.5rem" : "1rem" }}>
                                <span style={{ fontSize: movil ? "0.6rem" : "0.65rem", fontWeight: 800, color: "#424754", textTransform: "uppercase", letterSpacing: "0.07em" }}>{c.label}</span>
                                <span className="material-symbols-outlined" style={{ fontSize: movil ? "16px" : "20px", color: c.iconColor, opacity: 0.4 }}>{c.icon}</span>
                            </div>
                            <div style={{ fontSize: movil ? "1.15rem" : "1.7rem", fontWeight: 700, color: c.amountColor, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                                {c.amount < 0 ? "-" : ""}{formatCurrency(Math.abs(c.amount))}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px", color: c.subColor, fontSize: movil ? "0.68rem" : "0.78rem", fontWeight: 600 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{c.subIcon}</span>
                                {c.sub}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── FILTER BAR ── */}
                <div style={{ background: "#ECEDF7", borderRadius: "12px", padding: movil ? "0.75rem" : "1rem 1.25rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.6rem", border: "1px solid #C2C6D6" }}>
                    {!movil && <span style={{ fontSize: "0.78rem", color: "#424754", fontWeight: 600 }}>Filtrar por:</span>}
                    <select value={filterType} onChange={e => setFilterType(e.target.value as FilterType)}
                        style={{ background: "#fff", border: "1px solid #C2C6D6", borderRadius: "8px", padding: "6px 10px", fontSize: movil ? "0.75rem" : "0.82rem", fontFamily: "'Inter',sans-serif", color: "#191B23", cursor: "pointer", flex: movil ? 1 : undefined, minWidth: 0 }}>
                        <option value="todos">Todos los Tipos</option>
                        <option value="deuda">Solo Deudas</option>
                        <option value="cobro">Solo Cobros</option>
                    </select>
                    <select value={filterEstado} onChange={e => setFilterEstado(e.target.value as FilterEstado)}
                        style={{ background: "#fff", border: "1px solid #C2C6D6", borderRadius: "8px", padding: "6px 10px", fontSize: movil ? "0.75rem" : "0.82rem", fontFamily: "'Inter',sans-serif", color: "#191B23", cursor: "pointer", flex: movil ? 1 : undefined, minWidth: 0 }}>
                        <option value="todos">Todos los Estados</option>
                        <option value="vencido">Vencido</option>
                        <option value="proximo">Próximo</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="atrasado">Atrasado</option>
                        <option value="programado">Programado</option>
                    </select>
                    {!movil && (
                        <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                            {(["grid", "list"] as const).map(m => (
                                <button key={m} onClick={() => setViewMode(m)} style={{ padding: "6px 10px", borderRadius: "8px", border: "none", background: viewMode === m ? "#fff" : "transparent", boxShadow: viewMode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none", cursor: "pointer", color: viewMode === m ? "#0058BE" : "#424754" }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{m === "grid" ? "grid_view" : "list"}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── TABLES ── */}
            <div style={{ display: "grid", gridTemplateColumns: movil ? "1fr" : "repeat(auto-fit, minmax(380px, 1fr))", gap: movil ? "1.25rem" : "2rem" }}>
                {filterType !== "cobro" && (
                    <section style={CARD}>
                        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #C2C6D6", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F2F3FD" }}>
                            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#191B23", display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="material-symbols-outlined" style={{ color: "#BA1A1A", fontSize: "20px" }}>outbox</span>
                                Deudas (Cuentas por Pagar)
                            </h3>
                            <button style={{ background: "none", border: "none", color: "#0058BE", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Ver todo</button>
                        </div>
                        {movil ? renderDebtCards(filteredDebts) : renderDebtTable(filteredDebts)}
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
                        {movil ? renderCobroCards(filteredCobros) : renderCobroTable(filteredCobros)}
                    </section>
                )}
            </div>

            {/* ── ADD MODAL ── */}
            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: "fixed", inset: 0, background: "rgba(25,27,35,0.45)", backdropFilter: "blur(4px)", zIndex: 200 }}
                            onClick={() => setShowAddModal(false)}
                        />
                        <div style={{ position: "fixed", inset: 0, zIndex: 201, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", pointerEvents: "none" }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                                style={{ background: "#fff", borderRadius: "16px", padding: movil ? "1.25rem" : "2rem", width: movil ? "92vw" : "min(480px, 90vw)", maxHeight: "88vh", overflowY: "auto", boxShadow: "0px 12px 24px rgba(15,23,42,0.12)", pointerEvents: "auto" }}
                            >
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#191B23", fontFamily: "'Inter',sans-serif" }}>{editingTx ? "Editar Deuda / Cobro" : "Agregar Deuda / Cobro"}</h3>
                            <button onClick={() => { setShowAddModal(false); setEditingTx(null); setNewAccountId(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#727785", padding: "4px" }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                            <div style={{ display: "flex", gap: "8px", marginBottom: "1.25rem" }}>
                                {([
                                    { value: "gasto", label: "💸 Deuda (Debo)", activeColor: "#BA1A1A", activeBg: "#FFDAD6", activeText: "#93000A" },
                                    { value: "ingreso", label: "💰 Cobro (Me Deben)", activeColor: "#10B981", activeBg: "#D1FAE5", activeText: "#065F46" },
                                ] as const).map(opt => (
                                    <button key={opt.value} onClick={() => setNewType(opt.value)}
                                        style={{ flex: 1, padding: "10px", borderRadius: "8px", border: `2px solid ${newType === opt.value ? opt.activeColor : "#C2C6D6"}`, background: newType === opt.value ? opt.activeBg : "#fff", color: newType === opt.value ? opt.activeText : "#424754", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", transition: "all 0.15s" }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {[
                                { label: newType === "gasto" ? "Acreedor / Descripción" : "Deudor / Descripción", value: newText, setter: setNewText, placeholder: "Ej: Banco Nacional, Préstamo..." },
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

                            {!editingTx && (
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#424754", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.04em", fontFamily: "'Inter',sans-serif" }}>
                                        {newType === "gasto" ? "¿A qué cuenta entró el efectivo? (opcional)" : "¿De qué cuenta salió el efectivo? (opcional)"}
                                    </label>
                                    <select
                                        value={newAccountId}
                                        onChange={e => setNewAccountId(e.target.value)}
                                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #C2C6D6", borderRadius: "8px", fontFamily: "'Inter',sans-serif", fontSize: "0.9rem", color: "#191B23", boxSizing: "border-box" as const, outline: "none", background: "#fff" }}
                                    >
                                        <option value="">Solo registrar la deuda (sin mover efectivo)</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                    {newAccountId && (
                                        <p style={{ margin: "6px 0 0", fontSize: "0.7rem", color: "#424754" }}>
                                            {newType === "gasto"
                                                ? "Se sumará el monto a esa cuenta, como si te hubieran prestado el efectivo."
                                                : "Se restará el monto de esa cuenta, como si hubieras prestado el efectivo."}
                                        </p>
                                    )}
                                </div>
                            )}

<div style={{ display: "flex", gap: "8px", marginTop: "1.5rem" }}>
                                <button onClick={() => { setShowAddModal(false); setEditingTx(null); setNewAccountId(""); }} style={{ ...BTN_SECONDARY, flex: 1, justifyContent: "center" }}>Cancelar</button>
                                <button onClick={editingTx ? handleSaveEdit : handleAdd} style={{ ...BTN_PRIMARY, flex: 1, justifyContent: "center" }}>{editingTx ? "Guardar Cambios" : "Guardar"}</button>
                            </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

