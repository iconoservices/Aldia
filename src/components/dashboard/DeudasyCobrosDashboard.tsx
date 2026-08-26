import { useState, useMemo, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Transaction, Contact } from "../../hooks/useAlDiaState";
import { useIsMobile } from "../../theme";
import { ConfirmDialog } from "../ui/ConfirmDialog";

// En iOS Safari, `position: fixed` no se reacomoda cuando aparece el teclado: el
// modal se centra contra el alto de pantalla COMPLETO (sin teclado), así que su
// mitad de abajo (el botón "Guardar") termina detrás del teclado y el scroll
// interno del modal no alcanza a mostrarlo porque el propio contenedor ya quedó
// mal posicionado. `visualViewport` reporta el alto real visible y se actualiza
// en vivo — mismo fix que ya usa RegistroMovimiento para este problema.
const useVisualViewport = () => {
    const [vp, setVp] = useState(() => ({
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
        offsetTop: 0,
    }));

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const actualizar = () => setVp({ height: vv.height, offsetTop: vv.offsetTop });
        actualizar();
        vv.addEventListener('resize', actualizar);
        vv.addEventListener('scroll', actualizar);
        return () => {
            vv.removeEventListener('resize', actualizar);
            vv.removeEventListener('scroll', actualizar);
        };
    }, []);

    return vp;
};

interface DeudasyCobrosDashboardProps {
    transactions: Transaction[];
    addTransaction: (
        text: string, amount: number, type: "ingreso" | "gasto",
        isDebt: boolean, projectId?: number, accountId?: number,
        isCashless?: boolean, category?: string, contact?: string, dueDate?: string, notes?: string
    ) => void;
    removeTransaction: (id: number) => void;
    repayDebt: (originalTx: Transaction, amount: number, accountId: number) => void;
    updateTransaction: (id: number, updates: Partial<Transaction>) => void;
    accounts: { id: number; name: string; color: string }[];
    contacts?: Contact[];
    setContacts?: React.Dispatch<React.SetStateAction<Contact[]>>;
    addFixedExpense?: (text: string, amount: number, projectId?: number, dueDay?: number, accountId?: number, frequency?: 'monthly' | 'weekly', dueWeekday?: number, contact?: string, totalAmount?: number) => void;
}

// Antes registrar una deuda no tocaba ninguna cuenta: si te prestaban plata, "Debo"
// subía pero tu liquidez (Mis Cuentas) se quedaba igual, como si el efectivo no
// hubiera llegado. Al elegir una cuenta acá se crea una SEGUNDA transacción real
// (isDebt: false, si ligada a cuenta) que sí mueve el efectivo, sin tocar el cálculo
// de "Debo/Me deben" que ya vive en la transacción de seguimiento original.

type FilterType = "todos" | "deuda" | "cobro";
type FilterEstado = "todos" | "vencido" | "proximo" | "pendiente" | "confirmado" | "atrasado" | "programado";

// Una deuda no es una sola transacción: es un original + sus abonos ("Pago: X"),
// agrupados por contacto+texto. Antes esta pantalla listaba transacciones isDebt
// crudas por tipo, así que cada abono aparecía como un registro nuevo (y a veces
// del lado contrario) en vez de reducir el original. DebtGroup es el neto real.
interface DebtGroup {
    key: string;
    name: string;
    contact: string;
    amount: number;
    isOwe: boolean;
    originalTx: Transaction;
}

const getEstadoBadge = (tx: Transaction): { label: string; bg: string; text: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const refDate = tx.dueDate || tx.fullDate;
    const txDate = refDate ? new Date(refDate + "T12:00:00") : null;

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

const SELECT_MINI: React.CSSProperties = {
    width: "100%", padding: "5px 6px", borderRadius: "6px", border: "1px solid #E2E8F0",
    fontSize: "0.68rem", fontWeight: 700, outline: "none", background: "white", cursor: "pointer",
    boxSizing: "border-box",
};

// Panel del abono: cuenta arriba (ancho completo, para que se lea el nombre), monto y
// botones abajo — antes iba todo en una sola fila apretada y el selector quedaba
// ilegible.
const ABONO_PANEL: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: "5px",
    background: "#F8FAFC", border: "1px solid #E6E7F2", borderRadius: "8px",
    padding: "7px", minWidth: "150px",
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

// Panel inline para convertir una deuda en un gasto fijo a plazos: pide la cuota
// mensual, el día de cobro y la cuenta desde donde se paga. El monto total ya lo
// trae `item.amount` (el saldo restante de la deuda), no se pide de nuevo.
const ConvertPanel = ({ item, accounts, cuota, setCuota, dueDay, setDueDay, accountId, setAccountId, onConfirm, onCancel, full }: any) => (
    <div style={{ ...ABONO_PANEL, ...(full ? { flex: "1 1 100%" } : {}) }}>
        <div style={{ fontSize: "0.64rem", fontWeight: 700, color: "#424754" }}>
            A plazos · deuda total S/ {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <input type="number" placeholder="Cuota/mes" value={cuota ?? ""} onChange={e => setCuota(e.target.value)}
                style={{ width: "70px", padding: "5px 6px", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.68rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
            <input type="number" placeholder="Día" min="1" max="31" value={dueDay ?? ""} onChange={e => setDueDay(e.target.value)}
                style={{ width: "48px", padding: "5px 6px", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.68rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
            <select value={accountId ?? ""} onChange={e => setAccountId(e.target.value)} style={SELECT_MINI} title="¿De qué cuenta sale cada cuota?">
                <option value="">Sin cuenta</option>
                {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
            <button onClick={onConfirm} style={{ background: "#4858AB", color: "white", border: "none", borderRadius: "6px", padding: "5px 8px", fontWeight: 800, fontSize: "0.64rem", cursor: "pointer" }}>Convertir</button>
            <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: "2px", fontSize: "0.75rem", fontWeight: 800 }}>✕</button>
        </div>
    </div>
);

export const DeudasyCobrosDashboard = ({
    transactions,
    addTransaction,
    removeTransaction,
    updateTransaction,
    accounts,
    contacts = [],
    setContacts,
    addFixedExpense,
}: DeudasyCobrosDashboardProps) => {
    const movil = useIsMobile();
    const visualViewport = useVisualViewport();

    // Corrección retroactiva: las deudas creadas antes de este cambio restaban/sumaban
    // el doble en Balance/Patrimonio Neto (isCashless quedaba en false). Se corrige una
    // sola vez; una vez todas quedan en isCashless:true, el filtro ya no encuentra nada.
    useEffect(() => {
        const desactualizadas = transactions.filter(t => t.isDebt && !t.isCashless);
        desactualizadas.forEach(t => updateTransaction(t.id, { isCashless: true }));
    }, [transactions, updateTransaction]);

    const [filterType, setFilterType] = useState<FilterType>("todos");
    const [filterEstado, setFilterEstado] = useState<FilterEstado>("todos");
    const [viewMode, setViewMode] = useState<"list" | "grid" | "contacto">("list");
    const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());
    const [showAddModal, setShowAddModal] = useState(false);
    const [newType, setNewType] = useState<"gasto" | "ingreso">("gasto");
    const [newText, setNewText] = useState("");
    const [newContact, setNewContact] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newNotes, setNewNotes] = useState("");
    const [newAmount, setNewAmount] = useState("");
    const [newAccountId, setNewAccountId] = useState<string>("");
    const [newDueDate, setNewDueDate] = useState<string>("");
    const [confirmPayId, setConfirmPayId] = useState<number | null>(null);
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [abonarId, setAbonarId] = useState<number | null>(null);
    const [abonarAmount, setAbonarAmount] = useState<Record<number, string>>({});
    const [abonarAccountId, setAbonarAccountId] = useState<Record<number, string>>({});
    const [convertId, setConvertId] = useState<number | null>(null);
    const [convertCuota, setConvertCuota] = useState<Record<number, string>>({});
    const [convertDueDay, setConvertDueDay] = useState<Record<number, string>>({});
    const [convertAccountId, setConvertAccountId] = useState<Record<number, string>>({});
    const [confirmDeleteItem, setConfirmDeleteItem] = useState<DebtGroup | null>(null);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [editContactPhone, setEditContactPhone] = useState("");
    const [editContactNotes, setEditContactNotes] = useState("");

    // Agrupa cada deuda/cobro con sus abonos ("Pago: X") en un solo saldo neto —
    // misma lógica que activeDebtsAndCollections en FinanzasDashboard, para que
    // "Debo/Me deben" coincida en toda la app. El array de transacciones va del
    // más reciente al más antiguo, así que un abono puede aparecer ANTES que el
    // original; isOwe se deriva igual venga de cualquiera de los dos lados.
    const debtGroups = useMemo<DebtGroup[]>(() => {
        const relevant = transactions.filter(t => t.isDebt);
        const groups: Record<string, { total: number; originalTx: Transaction; isOwe: boolean }> = {};
        relevant.forEach(tx => {
            const isPayment = tx.text.startsWith("Pago: ");
            const baseText = isPayment ? tx.text.replace("Pago: ", "") : tx.text;
            const contact = tx.contact || "";
            const key = contact ? `${contact}::${baseText}` : `::${baseText}`;
            if (!groups[key]) {
                const isOwe = isPayment ? (tx.type === "ingreso") : (tx.type === "gasto");
                groups[key] = { total: 0, originalTx: tx, isOwe };
            }
            if (isPayment) {
                groups[key].total -= Math.abs(tx.amount);
            } else {
                groups[key].total += Math.abs(tx.amount);
                groups[key].originalTx = tx;
            }
        });
        return Object.entries(groups)
            .filter(([, g]) => g.total > 0.01)
            .map(([key, g]) => {
                const [contact, name] = key.split("::");
                return { key, name, contact, amount: g.total, isOwe: g.isOwe, originalTx: g.originalTx };
            });
    }, [transactions]);

    const debtItems = useMemo(() => debtGroups.filter(g => g.isOwe), [debtGroups]);
    const cobroItems = useMemo(() => debtGroups.filter(g => !g.isOwe), [debtGroups]);

    // Nombres de contacto ya usados, para sugerir con datalist al escribir uno nuevo
    // y evitar que "Carlos" y "carlos " terminen como dos contactos distintos. Junta
    // los nombres del registro de Contactos con los que ya aparecen en deudas viejas
    // que todavía no tienen un Contact asociado.
    const uniqueContacts = useMemo(() => {
        const set = new Set<string>();
        contacts.forEach(c => set.add(c.name));
        debtGroups.forEach(g => { if (g.contact) set.add(g.contact); });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [debtGroups, contacts]);

    const findContactByName = (name: string) =>
        contacts.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());

    // Guarda o actualiza el contacto por nombre (sin id, porque el campo de texto solo
    // conoce el nombre). Si ya existe, solo pisa el teléfono cuando viene uno nuevo —
    // así una deuda futura sin teléfono no borra el que ya se había guardado.
    const upsertContactByName = (name: string, phone: string) => {
        const trimmed = name.trim();
        if (!trimmed || !setContacts) return;
        setContacts(prev => {
            const existing = prev.find(c => c.name.trim().toLowerCase() === trimmed.toLowerCase());
            if (existing) {
                if (!phone.trim()) return prev;
                return prev.map(c => c.id === existing.id ? { ...c, phone: phone.trim() } : c);
            }
            return [...prev, { id: Date.now(), name: trimmed, phone: phone.trim() || undefined }];
        });
    };

    // Mismos DebtGroup de siempre, pero reagrupados por contacto en vez de por
    // contacto+concepto: así "Juan" junta su préstamo de la cuota 1, 2 y 3 en una
    // sola vista con el total, en vez de tres tarjetas sueltas con el mismo nombre.
    const contactGroups = useMemo(() => {
        const map: Record<string, { contact: string; totalDebo: number; totalMeDeben: number; items: DebtGroup[] }> = {};
        debtGroups.forEach(g => {
            const key = g.contact || "";
            if (!map[key]) map[key] = { contact: key, totalDebo: 0, totalMeDeben: 0, items: [] };
            if (g.isOwe) map[key].totalDebo += g.amount; else map[key].totalMeDeben += g.amount;
            map[key].items.push(g);
        });
        return Object.values(map).sort((a, b) => {
            if (!a.contact) return 1;
            if (!b.contact) return -1;
            return a.contact.localeCompare(b.contact);
        });
    }, [debtGroups]);

    const toggleContactExpanded = (key: string) => {
        setExpandedContacts(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const openEditContact = (name: string) => {
        const existing = findContactByName(name);
        setEditingContact(existing || { id: Date.now(), name });
        setEditContactPhone(existing?.phone || "");
        setEditContactNotes(existing?.notes || "");
    };

    const saveEditContact = () => {
        if (!editingContact || !setContacts) return;
        const updated: Contact = { ...editingContact, phone: editContactPhone.trim() || undefined, notes: editContactNotes.trim() || undefined };
        setContacts(prev => prev.some(c => c.id === updated.id) ? prev.map(c => c.id === updated.id ? updated : c) : [...prev, updated]);
        setEditingContact(null);
    };

    const handleAbonar = (item: DebtGroup, amount: number, accountId?: number) => {
        if (amount <= 0) return;
        const value = Math.min(amount, item.amount);
        // El tipo va invertido respecto al original a propósito — es la misma
        // convención que usa debtGroups para reconocer un abono y restarlo del
        // total sin importar el orden en que aparezcan las transacciones.
        addTransaction(
            `Pago: ${item.name}`,
            item.isOwe ? value : -value,
            item.isOwe ? "ingreso" : "gasto",
            true,
            undefined,
            undefined,
            true,
            "Deudas",
            item.contact || undefined
        );
        // Si se eligió cuenta, el efectivo también se mueve de verdad — misma idea que
        // al crear la deuda: "Debo" (isOwe) = yo pago, sale plata; "Me deben" = me pagan,
        // entra plata. Sin esto, abonar/cobrar nunca tocaba ninguna cuenta.
        if (accountId) {
            addTransaction(
                item.isOwe ? `Pago: ${item.name}` : `Cobro: ${item.name}`,
                value,
                item.isOwe ? "gasto" : "ingreso",
                false,
                undefined,
                accountId,
                false,
                "Deudas",
                item.contact || undefined
            );
        }
        setAbonarId(null);
        setAbonarAmount(m => ({ ...m, [item.originalTx.id]: "" }));
        setAbonarAccountId(m => ({ ...m, [item.originalTx.id]: "" }));
    };

    const openAbonar = (item: DebtGroup) => {
        const id = item.originalTx.id;
        setAbonarId(id);
        setAbonarAmount(m => ({ ...m, [id]: String(item.amount) }));
        setAbonarAccountId(m => ({ ...m, [id]: item.originalTx.accountId ? String(item.originalTx.accountId) : "" }));
    };

    const closeAbonar = (id: number) => {
        setAbonarId(null);
        setAbonarAmount(m => ({ ...m, [id]: "" }));
        setAbonarAccountId(m => ({ ...m, [id]: "" }));
    };

    // Convierte una deuda (con su saldo restante) en un gasto fijo a plazos: crea el
    // gasto fijo con `totalAmount` = lo que faltaba, y cierra la deuda original acá,
    // así el saldo no queda contado doble entre Deudas y Gastos Fijos.
    const openConvert = (item: DebtGroup) => {
        const id = item.originalTx.id;
        setConvertId(id);
        setConvertCuota(m => ({ ...m, [id]: item.amount.toFixed(2) }));
        setConvertDueDay(m => ({ ...m, [id]: "" }));
        setConvertAccountId(m => ({ ...m, [id]: item.originalTx.accountId ? String(item.originalTx.accountId) : "" }));
    };

    const closeConvert = (id: number) => {
        setConvertId(null);
        setConvertCuota(m => ({ ...m, [id]: "" }));
        setConvertDueDay(m => ({ ...m, [id]: "" }));
        setConvertAccountId(m => ({ ...m, [id]: "" }));
    };

    const handleConvert = (item: DebtGroup) => {
        if (!addFixedExpense) return;
        const id = item.originalTx.id;
        const cuota = parseFloat(convertCuota[id] || "");
        if (!cuota || cuota <= 0) return;
        const dueDay = convertDueDay[id] ? Number(convertDueDay[id]) : undefined;
        const accountId = convertAccountId[id] ? Number(convertAccountId[id]) : undefined;
        addFixedExpense(item.name, cuota, undefined, dueDay, accountId, 'monthly', undefined, item.contact || undefined, item.amount);
        removeTransaction(item.originalTx.id);
        closeConvert(id);
    };

    const handleEdit = (item: DebtGroup) => {
        setEditingTx(item.originalTx);
        setNewText(item.name);
        setNewContact(item.contact);
        setNewPhone(findContactByName(item.contact)?.phone || "");
        setNewNotes(item.originalTx.notes || "");
        setNewAmount(String(Math.abs(item.originalTx.amount)));
        setNewType(item.originalTx.type);
        setNewAccountId(item.originalTx.accountId ? String(item.originalTx.accountId) : "");
        setNewDueDate(item.originalTx.dueDate || "");
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
            newAccountId ? Number(newAccountId) : undefined,
            // isCashless: la deuda en sí no es un movimiento de caja real, así que no debe
            // restar/sumar en Balance/Patrimonio Neto por su cuenta — solo cuenta "Debo/Me Deben".
            true,
            "Deudas",
            newContact.trim() || undefined,
            newDueDate || undefined,
            newNotes.trim() || undefined
        );
        if (newContact.trim()) upsertContactByName(newContact, newPhone);
        setEditingTx(null);
        setShowAddModal(false);
        setNewText("");
        setNewContact("");
        setNewPhone("");
        setNewNotes("");
        setNewAmount("");
        setNewAccountId("");
        setNewDueDate("");
    };

    const handleDelete = (item: DebtGroup) => setConfirmDeleteItem(item);

    const confirmDeleteNow = () => {
        if (confirmDeleteItem) removeTransaction(confirmDeleteItem.originalTx.id);
        setConfirmDeleteItem(null);
    };

    const totalPagar = useMemo(() => debtItems.reduce((s, d) => s + d.amount, 0), [debtItems]);
    const totalCobrar = useMemo(() => cobroItems.reduce((s, d) => s + d.amount, 0), [cobroItems]);

    const balanceNeto = totalCobrar - totalPagar;

    // Mismo contacto, filas juntas: antes el orden era por fecha de creación, así que
    // dos deudas de "Mirka" podían quedar separadas por una de "Roy" en medio. El sort
    // es estable (ES2019+), así que dentro de un mismo contacto no se pierde el orden
    // relativo, y los que no tienen contacto quedan al final tal como estaban entre sí.
    const sortByContact = (items: DebtGroup[]) => [...items].sort((a, b) => {
        if (a.contact === b.contact) return 0;
        if (!a.contact) return 1;
        if (!b.contact) return -1;
        return a.contact.localeCompare(b.contact);
    });

    const filteredDebts = useMemo(() => {
        const base = filterEstado === "todos" ? debtItems : debtItems.filter(d => getEstadoBadge(d.originalTx).label.toLowerCase() === filterEstado);
        return sortByContact(base);
    }, [debtItems, filterEstado]);

    const filteredCobros = useMemo(() => {
        const base = filterEstado === "todos" ? cobroItems : cobroItems.filter(d => getEstadoBadge(d.originalTx).label.toLowerCase() === filterEstado);
        return sortByContact(base);
    }, [cobroItems, filterEstado]);

    // Anota cada fila con si es la primera/última de su racha de mismo contacto (ya
    // vienen juntas gracias a sortByContact) y el conteo/total del grupo, para poder
    // no repetir el avatar y mostrar un subtotal al cerrar el grupo.
    const annotateGroups = (items: DebtGroup[]) => {
        const counts: Record<string, { count: number; total: number }> = {};
        items.forEach(i => {
            if (!i.contact) return;
            if (!counts[i.contact]) counts[i.contact] = { count: 0, total: 0 };
            counts[i.contact].count++;
            counts[i.contact].total += i.amount;
        });
        return items.map((item, idx) => {
            const sameAsPrev = idx > 0 && !!item.contact && items[idx - 1].contact === item.contact;
            const sameAsNext = idx < items.length - 1 && !!item.contact && items[idx + 1].contact === item.contact;
            const g = item.contact ? counts[item.contact] : undefined;
            return {
                item,
                groupCount: g?.count ?? 1,
                groupTotal: g?.total ?? item.amount,
                isFirstOfGroup: !sameAsPrev,
                isLastOfGroup: !sameAsNext,
            };
        });
    };

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
            // accountId aquí es solo metadata (a qué cuenta pertenece la deuda) —
            // no mueve efectivo por sí sola, eso lo hace la transacción real de abajo.
            newAccountId ? Number(newAccountId) : undefined,
            // isCashless: la deuda en sí no es un movimiento de caja real (haya o no
            // cuenta ligada) — si hay cuenta, el efectivo lo cuenta la transacción real
            // de abajo; si no la hay, todavía no hay caja de por medio. Sin esto, cada
            // deuda restaba/sumaba el doble en Balance/Patrimonio Neto.
            true,
            undefined,
            newContact.trim() || undefined,
            newDueDate || undefined,
            newNotes.trim() || undefined
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
        if (newContact.trim()) upsertContactByName(newContact, newPhone);
        setNewText(""); setNewContact(""); setNewPhone(""); setNewNotes(""); setNewAmount(""); setNewAccountId(""); setNewDueDate("");
        setShowAddModal(false);
    };

    const handleMarkPaid = (item: DebtGroup) => {
        removeTransaction(item.originalTx.id);
        setConfirmPayId(null);
    };

    const renderDebtTable = (items: DebtGroup[]) => (
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
                    {annotateGroups(items).map(({ item, groupCount, groupTotal, isFirstOfGroup, isLastOfGroup }) => {
                        const badge = getEstadoBadge(item.originalTx);
                        const iconC = getIconColor(badge);
                        const icon = getContactIcon(item.contact || item.name, "gasto");
                        const id = item.originalTx.id;
                        return (
                            <Fragment key={item.key}>
                                <tr
                                    style={{ transition: "background 0.15s" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "#F2F3FD")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                >
                                    <td style={{ ...TD, borderBottom: isLastOfGroup ? TD.borderBottom : "1px solid transparent" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            {isFirstOfGroup ? (
                                                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: iconC.bg, color: iconC.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>{icon}</span>
                                                </div>
                                            ) : (
                                                <div style={{ width: "32px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
                                                    <div style={{ width: "2px", alignSelf: "stretch", minHeight: "18px", background: "#DAE2FD" }} />
                                                </div>
                                            )}
                                            <div>
                                                {isFirstOfGroup ? (
                                                    <div style={{ fontWeight: 600 }}>{item.contact || item.name}{groupCount > 1 ? ` (${groupCount})` : ""}</div>
                                                ) : (
                                                    <div style={{ fontSize: "0.72rem", color: "#94A3B8", fontWeight: 600 }}>↳ mismo contacto</div>
                                                )}
                                                {item.contact && <div style={{ fontSize: "0.72rem", color: "#727785" }}>{item.name}</div>}
                                                {item.originalTx.notes && <div style={{ fontSize: "0.7rem", color: "#94A3B8", fontStyle: "italic" }}>{item.originalTx.notes}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ ...TD, borderBottom: isLastOfGroup ? TD.borderBottom : "1px solid transparent", fontWeight: 700, color: "#BA1A1A", fontVariantNumeric: "tabular-nums" }}>
                                        {formatCurrency(item.amount)}
                                    </td>
                                    <td style={{ ...TD, borderBottom: isLastOfGroup ? TD.borderBottom : "1px solid transparent", color: "#424754", fontSize: "0.82rem" }}>{formatDate(item.originalTx.dueDate || item.originalTx.fullDate)}</td>
                                    <td style={{ ...TD, borderBottom: isLastOfGroup ? TD.borderBottom : "1px solid transparent" }}>
                                        <span style={{ padding: "3px 10px", borderRadius: "999px", background: badge.bg, color: badge.text, fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                                            {badge.label}
                                        </span>
                                    </td>
                                    <td style={{ ...TD, borderBottom: isLastOfGroup ? TD.borderBottom : "1px solid transparent" }}>
                                        <div style={{ display: "flex", gap: "4px" }}>
                                            {abonarId === id ? (
                                                <div style={ABONO_PANEL}>
                                                    <select value={abonarAccountId[id] ?? ""} onChange={e => setAbonarAccountId(m => ({ ...m, [id]: e.target.value }))} style={SELECT_MINI} title="¿De qué cuenta sale?">
                                                        <option value="">Sin cuenta</option>
                                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                    </select>
                                                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                                        <input type="number" value={abonarAmount[id] ?? item.amount.toFixed(2)} onChange={e => setAbonarAmount(m => ({ ...m, [id]: e.target.value }))}
                                                            style={{ width: "56px", padding: "5px 6px", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.68rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                                                        <button onClick={() => handleAbonar(item, parseFloat(abonarAmount[id] || String(item.amount)), abonarAccountId[id] ? Number(abonarAccountId[id]) : undefined)} style={{ background: "#10B981", color: "white", border: "none", borderRadius: "6px", padding: "5px 8px", fontWeight: 800, fontSize: "0.64rem", cursor: "pointer" }}>Abonar</button>
                                                        <button onClick={() => handleAbonar(item, item.amount, abonarAccountId[id] ? Number(abonarAccountId[id]) : undefined)} style={{ background: "#059669", color: "white", border: "none", borderRadius: "6px", padding: "5px 8px", fontWeight: 800, fontSize: "0.64rem", cursor: "pointer" }}>Todo</button>
                                                        <button onClick={() => closeAbonar(id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: "2px", fontSize: "0.75rem", fontWeight: 800 }}>✕</button>
                                                    </div>
                                                </div>
                                            ) : convertId === id ? (
                                                <ConvertPanel item={item} accounts={accounts} cuota={convertCuota[id]} setCuota={(v: string) => setConvertCuota(m => ({ ...m, [id]: v }))} dueDay={convertDueDay[id]} setDueDay={(v: string) => setConvertDueDay(m => ({ ...m, [id]: v }))} accountId={convertAccountId[id]} setAccountId={(v: string) => setConvertAccountId(m => ({ ...m, [id]: v }))} onConfirm={() => handleConvert(item)} onCancel={() => closeConvert(id)} />
                                            ) : (
                                                <>
                                                    <button onClick={() => openAbonar(item)} title="Abonar" style={{ background: "#E2E8F0", border: "none", borderRadius: "4px", padding: "2px 6px", fontWeight: 700, fontSize: "0.6rem", cursor: "pointer", color: "#475569" }}>Abonar</button>
                                                    {addFixedExpense && (
                                                        <button onClick={() => openConvert(item)} title="Convertir a pago fijo" style={{ background: "#DAE2FD", border: "none", borderRadius: "4px", padding: "2px 6px", fontWeight: 700, fontSize: "0.6rem", cursor: "pointer", color: "#4858AB" }}>A plazos</button>
                                                    )}
                                                    <button onClick={() => handleEdit(item)} title="Editar" style={{ background: "none", border: "1px solid #0058BE", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#0058BE" }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: "14px", verticalAlign: "middle" }}>edit</span>
                                                    </button>
                                                    <button onClick={() => handleDelete(item)} title="Eliminar" style={{ background: "none", border: "1px solid #BA1A1A", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#BA1A1A" }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: "14px", verticalAlign: "middle" }}>delete</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                {isLastOfGroup && groupCount > 1 && (
                                    <tr style={{ background: "#F8FAFC" }}>
                                        <td colSpan={5} style={{ ...TD, padding: "6px 16px 6px 52px", fontSize: "0.74rem" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <span style={{ color: "#727785", fontWeight: 700 }}>Subtotal {item.contact} · {groupCount} deudas</span>
                                                <span style={{ fontWeight: 800, color: "#BA1A1A" }}>{formatCurrency(groupTotal)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderCobroTable = (items: DebtGroup[]) => (
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
                    {annotateGroups(items).map(({ item, groupCount, groupTotal, isFirstOfGroup, isLastOfGroup }) => {
                        const badge = getEstadoBadge(item.originalTx);
                        const iconC = getIconColor(badge);
                        const icon = getContactIcon(item.contact || item.name, "ingreso");
                        const id = item.originalTx.id;
                        return (
                            <Fragment key={item.key}>
                            <tr
                                style={{ transition: "background 0.15s" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "#F2F3FD")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                                <td style={{ ...TD, borderBottom: isLastOfGroup ? TD.borderBottom : "1px solid transparent" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        {isFirstOfGroup ? (
                                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: iconC.bg, color: iconC.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>{icon}</span>
                                            </div>
                                        ) : (
                                            <div style={{ width: "32px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
                                                <div style={{ width: "2px", alignSelf: "stretch", minHeight: "18px", background: "#D1FAE5" }} />
                                            </div>
                                        )}
                                        <div>
                                            {isFirstOfGroup ? (
                                                <div style={{ fontWeight: 600 }}>{item.contact || item.name}{groupCount > 1 ? ` (${groupCount})` : ""}</div>
                                            ) : (
                                                <div style={{ fontSize: "0.72rem", color: "#94A3B8", fontWeight: 600 }}>↳ mismo contacto</div>
                                            )}
                                            {item.contact && <div style={{ fontSize: "0.72rem", color: "#727785" }}>{item.name}</div>}
                                            {item.originalTx.notes && <div style={{ fontSize: "0.7rem", color: "#94A3B8", fontStyle: "italic" }}>{item.originalTx.notes}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td style={{ ...TD, borderBottom: isLastOfGroup ? TD.borderBottom : "1px solid transparent", fontWeight: 700, color: "#10B981", fontVariantNumeric: "tabular-nums" }}>
                                    {formatCurrency(item.amount)}
                                </td>
                                <td style={{ ...TD, borderBottom: isLastOfGroup ? TD.borderBottom : "1px solid transparent", color: "#424754", fontSize: "0.82rem" }}>{formatDate(item.originalTx.dueDate || item.originalTx.fullDate)}</td>
                                <td style={{ ...TD, borderBottom: isLastOfGroup ? TD.borderBottom : "1px solid transparent" }}>
                                    <span style={{ padding: "3px 10px", borderRadius: "999px", background: badge.bg, color: badge.text, fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
                                        {badge.label}
                                    </span>
                                </td>
<td style={{ ...TD, borderBottom: isLastOfGroup ? TD.borderBottom : "1px solid transparent" }}>
                                    {confirmPayId === id ? (
                                        <div style={{ display: "flex", gap: "4px" }}>
                                            <button onClick={() => handleMarkPaid(item)} style={{ ...BTN_PRIMARY, padding: "4px 10px", fontSize: "0.72rem", boxShadow: "none" }}>✓ Confirmar</button>
                                            <button onClick={() => setConfirmPayId(null)} style={{ ...BTN_SECONDARY, padding: "4px 10px", fontSize: "0.72rem" }}>✗</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                            {abonarId === id ? (
                                                <div style={ABONO_PANEL}>
                                                    <select value={abonarAccountId[id] ?? ""} onChange={e => setAbonarAccountId(m => ({ ...m, [id]: e.target.value }))} style={SELECT_MINI} title="¿A qué cuenta entra?">
                                                        <option value="">Sin cuenta</option>
                                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                    </select>
                                                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                                        <input type="number" value={abonarAmount[id] ?? item.amount.toFixed(2)} onChange={e => setAbonarAmount(m => ({ ...m, [id]: e.target.value }))}
                                                            style={{ width: "56px", padding: "5px 6px", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.68rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                                                        <button onClick={() => handleAbonar(item, parseFloat(abonarAmount[id] || String(item.amount)), abonarAccountId[id] ? Number(abonarAccountId[id]) : undefined)} style={{ background: "#10B981", color: "white", border: "none", borderRadius: "6px", padding: "5px 8px", fontWeight: 800, fontSize: "0.64rem", cursor: "pointer" }}>Cobrar</button>
                                                        <button onClick={() => handleAbonar(item, item.amount, abonarAccountId[id] ? Number(abonarAccountId[id]) : undefined)} style={{ background: "#059669", color: "white", border: "none", borderRadius: "6px", padding: "5px 8px", fontWeight: 800, fontSize: "0.64rem", cursor: "pointer" }}>Todo</button>
                                                        <button onClick={() => closeAbonar(id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: "2px", fontSize: "0.75rem", fontWeight: 800 }}>✕</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <button onClick={() => openAbonar(item)} title="Cobrar" style={{ background: "#E2E8F0", border: "none", borderRadius: "4px", padding: "2px 6px", fontWeight: 700, fontSize: "0.6rem", cursor: "pointer", color: "#475569" }}>Cobrar</button>
                                                    <button onClick={() => handleEdit(item)} title="Editar" style={{ background: "none", border: "1px solid #0058BE", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#0058BE" }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: "14px", verticalAlign: "middle" }}>edit</span>
                                                    </button>
                                                    <button onClick={() => handleDelete(item)} title="Eliminar" style={{ background: "none", border: "1px solid #BA1A1A", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#BA1A1A" }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: "14px", verticalAlign: "middle" }}>delete</span>
                                                    </button>
                                                    <button onClick={() => setConfirmPayId(id)} title="Marcar como cobrado" style={{ background: "none", border: "1px solid #C2C6D6", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#424754" }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: "14px", verticalAlign: "middle" }}>check_circle</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                            {isLastOfGroup && groupCount > 1 && (
                                <tr style={{ background: "#F8FAFC" }}>
                                    <td colSpan={5} style={{ ...TD, padding: "6px 16px 6px 52px", fontSize: "0.74rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <span style={{ color: "#727785", fontWeight: 700 }}>Subtotal {item.contact} · {groupCount} cobros</span>
                                            <span style={{ fontWeight: 800, color: "#10B981" }}>{formatCurrency(groupTotal)}</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    // Vista móvil: la tabla de 5 columnas no entra en una pantalla angosta,
    // así que cada fila se convierte en una tarjeta apilada (mismo dato, otro layout).
    const renderDebtCards = (items: DebtGroup[]) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.75rem" }}>
            {items.length === 0 && (
                <p style={{ textAlign: "center", color: "#727785", padding: "2rem 0", margin: 0, fontSize: "0.85rem" }}>Sin deudas registradas 🎉</p>
            )}
            {annotateGroups(items).map(({ item, groupCount, groupTotal, isFirstOfGroup, isLastOfGroup }) => {
                const badge = getEstadoBadge(item.originalTx);
                const iconC = getIconColor(badge);
                const icon = getContactIcon(item.contact || item.name, "gasto");
                const id = item.originalTx.id;
                return (
                    <Fragment key={item.key}>
                    <div style={{ background: "#fff", border: "1px solid #E6E7F2", borderLeft: isFirstOfGroup ? "1px solid #E6E7F2" : "3px solid #DAE2FD", borderRadius: "12px", padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: iconC.bg, color: iconC.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{icon}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {isFirstOfGroup ? (
                                    <div style={{ fontWeight: 700, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.contact || item.name}{groupCount > 1 ? ` (${groupCount})` : ""}</div>
                                ) : (
                                    <div style={{ fontSize: "0.7rem", color: "#94A3B8", fontWeight: 700 }}>↳ mismo contacto</div>
                                )}
                                {item.contact && <div style={{ fontSize: "0.66rem", color: "#727785", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>}
                                {item.originalTx.notes && <div style={{ fontSize: "0.64rem", color: "#94A3B8", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.originalTx.notes}</div>}
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontWeight: 700, color: "#BA1A1A", fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(item.amount)}</div>
                                <div style={{ fontSize: "0.6rem", color: "#424754" }}>{formatDate(item.originalTx.dueDate || item.originalTx.fullDate)}</div>
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: (abonarId === id || convertId === id) ? "flex-start" : "center", marginTop: "8px", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ padding: "2px 8px", borderRadius: "999px", background: badge.bg, color: badge.text, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em", flexShrink: 0 }}>
                                {badge.label}
                            </span>
                            {abonarId === id ? (
                                <div style={{ ...ABONO_PANEL, flex: "1 1 100%" }}>
                                    <select value={abonarAccountId[id] ?? ""} onChange={e => setAbonarAccountId(m => ({ ...m, [id]: e.target.value }))} style={SELECT_MINI} title="¿De qué cuenta sale?">
                                        <option value="">Sin cuenta</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                        <input type="number" value={abonarAmount[id] ?? item.amount.toFixed(2)} onChange={e => setAbonarAmount(m => ({ ...m, [id]: e.target.value }))}
                                            style={{ width: "56px", padding: "5px 6px", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.68rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                                        <button onClick={() => handleAbonar(item, parseFloat(abonarAmount[id] || String(item.amount)), abonarAccountId[id] ? Number(abonarAccountId[id]) : undefined)} style={{ background: "#10B981", color: "white", border: "none", borderRadius: "6px", padding: "5px 8px", fontWeight: 800, fontSize: "0.64rem", cursor: "pointer" }}>Abonar</button>
                                        <button onClick={() => closeAbonar(id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: "2px", fontSize: "0.75rem", fontWeight: 800 }}>✕</button>
                                    </div>
                                </div>
                            ) : convertId === id ? (
                                <ConvertPanel item={item} accounts={accounts} cuota={convertCuota[id]} setCuota={(v: string) => setConvertCuota(m => ({ ...m, [id]: v }))} dueDay={convertDueDay[id]} setDueDay={(v: string) => setConvertDueDay(m => ({ ...m, [id]: v }))} accountId={convertAccountId[id]} setAccountId={(v: string) => setConvertAccountId(m => ({ ...m, [id]: v }))} onConfirm={() => handleConvert(item)} onCancel={() => closeConvert(id)} full />
                            ) : (
                                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                    <button onClick={() => openAbonar(item)} title="Abonar" style={{ background: "#E2E8F0", border: "none", borderRadius: "4px", padding: "4px 7px", fontWeight: 700, fontSize: "0.62rem", cursor: "pointer", color: "#475569" }}>Abonar</button>
                                    {addFixedExpense && (
                                        <button onClick={() => openConvert(item)} title="Convertir a pago fijo" style={{ background: "#DAE2FD", border: "none", borderRadius: "4px", padding: "4px 7px", fontWeight: 700, fontSize: "0.62rem", cursor: "pointer", color: "#4858AB" }}>A plazos</button>
                                    )}
                                    <button onClick={() => handleEdit(item)} title="Editar" style={{ background: "none", border: "1px solid #0058BE", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: "#0058BE", display: "flex" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(item)} title="Eliminar" style={{ background: "none", border: "1px solid #BA1A1A", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: "#BA1A1A", display: "flex" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>delete</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    {isLastOfGroup && groupCount > 1 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC", border: "1px dashed #C2C6D6", borderRadius: "8px", padding: "5px 10px", fontSize: "0.68rem", marginTop: "-0.3rem" }}>
                            <span style={{ color: "#727785", fontWeight: 700 }}>Subtotal {item.contact} · {groupCount} deudas</span>
                            <span style={{ fontWeight: 800, color: "#BA1A1A" }}>{formatCurrency(groupTotal)}</span>
                        </div>
                    )}
                    </Fragment>
                );
            })}
        </div>
    );

    const renderCobroCards = (items: DebtGroup[]) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", padding: "0.75rem" }}>
            {items.length === 0 && (
                <p style={{ textAlign: "center", color: "#727785", padding: "2rem 0", margin: 0, fontSize: "0.85rem" }}>Sin cobros registrados</p>
            )}
            {annotateGroups(items).map(({ item, groupCount, groupTotal, isFirstOfGroup, isLastOfGroup }) => {
                const badge = getEstadoBadge(item.originalTx);
                const iconC = getIconColor(badge);
                const icon = getContactIcon(item.contact || item.name, "ingreso");
                const id = item.originalTx.id;
                return (
                    <Fragment key={item.key}>
                    <div style={{ background: "#fff", border: "1px solid #E6E7F2", borderLeft: isFirstOfGroup ? "1px solid #E6E7F2" : "3px solid #D1FAE5", borderRadius: "12px", padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: iconC.bg, color: iconC.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{icon}</span>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {isFirstOfGroup ? (
                                    <div style={{ fontWeight: 700, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.contact || item.name}{groupCount > 1 ? ` (${groupCount})` : ""}</div>
                                ) : (
                                    <div style={{ fontSize: "0.7rem", color: "#94A3B8", fontWeight: 700 }}>↳ mismo contacto</div>
                                )}
                                {item.contact && <div style={{ fontSize: "0.66rem", color: "#727785", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>}
                                {item.originalTx.notes && <div style={{ fontSize: "0.64rem", color: "#94A3B8", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.originalTx.notes}</div>}
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontWeight: 700, color: "#10B981", fontSize: "0.82rem", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(item.amount)}</div>
                                <div style={{ fontSize: "0.6rem", color: "#424754" }}>{formatDate(item.originalTx.dueDate || item.originalTx.fullDate)}</div>
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ padding: "2px 8px", borderRadius: "999px", background: badge.bg, color: badge.text, fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em", flexShrink: 0 }}>
                                {badge.label}
                            </span>
                            {confirmPayId === id ? (
                                <div style={{ display: "flex", gap: "4px" }}>
                                    <button onClick={() => handleMarkPaid(item)} style={{ ...BTN_PRIMARY, padding: "4px 10px", fontSize: "0.68rem", boxShadow: "none" }}>✓ Confirmar</button>
                                    <button onClick={() => setConfirmPayId(null)} style={{ ...BTN_SECONDARY, padding: "4px 10px", fontSize: "0.68rem" }}>✗</button>
                                </div>
                            ) : abonarId === id ? (
                                <div style={{ ...ABONO_PANEL, flex: "1 1 100%" }}>
                                    <select value={abonarAccountId[id] ?? ""} onChange={e => setAbonarAccountId(m => ({ ...m, [id]: e.target.value }))} style={SELECT_MINI} title="¿A qué cuenta entra?">
                                        <option value="">Sin cuenta</option>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                        <input type="number" value={abonarAmount[id] ?? item.amount.toFixed(2)} onChange={e => setAbonarAmount(m => ({ ...m, [id]: e.target.value }))}
                                            style={{ width: "56px", padding: "5px 6px", borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "0.68rem", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
                                        <button onClick={() => handleAbonar(item, parseFloat(abonarAmount[id] || String(item.amount)), abonarAccountId[id] ? Number(abonarAccountId[id]) : undefined)} style={{ background: "#10B981", color: "white", border: "none", borderRadius: "6px", padding: "5px 8px", fontWeight: 800, fontSize: "0.64rem", cursor: "pointer" }}>Cobrar</button>
                                        <button onClick={() => closeAbonar(id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: "2px", fontSize: "0.75rem", fontWeight: 800 }}>✕</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", gap: "4px" }}>
                                    <button onClick={() => openAbonar(item)} title="Cobrar" style={{ background: "#E2E8F0", border: "none", borderRadius: "4px", padding: "4px 7px", fontWeight: 700, fontSize: "0.62rem", cursor: "pointer", color: "#475569" }}>Cobrar</button>
                                    <button onClick={() => handleEdit(item)} title="Editar" style={{ background: "none", border: "1px solid #0058BE", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: "#0058BE", display: "flex" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>edit</span>
                                    </button>
                                    <button onClick={() => handleDelete(item)} title="Eliminar" style={{ background: "none", border: "1px solid #BA1A1A", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: "#BA1A1A", display: "flex" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>delete</span>
                                    </button>
                                    <button onClick={() => setConfirmPayId(id)} title="Marcar como cobrado" style={{ background: "none", border: "1px solid #C2C6D6", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", color: "#424754", display: "flex" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>check_circle</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    {isLastOfGroup && groupCount > 1 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC", border: "1px dashed #C2C6D6", borderRadius: "8px", padding: "5px 10px", fontSize: "0.68rem", marginTop: "-0.3rem" }}>
                            <span style={{ color: "#727785", fontWeight: 700 }}>Subtotal {item.contact} · {groupCount} cobros</span>
                            <span style={{ fontWeight: 800, color: "#10B981" }}>{formatCurrency(groupTotal)}</span>
                        </div>
                    )}
                    </Fragment>
                );
            })}
        </div>
    );

    // Vista "Por contacto": una tarjeta por persona/entidad con el total Debo/Me deben
    // arriba (colapsada) y el detalle de cada deuda o cobro suyo al expandir — reusa
    // las mismas tarjetas de arriba, solo cambia el agrupamiento.
    const renderContactView = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "0.6rem" : "0.85rem" }}>
            {contactGroups.length === 0 && (
                <p style={{ textAlign: "center", color: "#727785", padding: "2.5rem 0", margin: 0, fontSize: "0.85rem" }}>Sin deudas o cobros registrados 🎉</p>
            )}
            {contactGroups.map(cg => {
                const key = cg.contact || "__sin_contacto__";
                const isOpen = expandedContacts.has(key);
                const debtos = cg.items.filter(i => i.isOwe);
                const cobros = cg.items.filter(i => !i.isOwe);
                const contactPhone = cg.contact ? findContactByName(cg.contact)?.phone : undefined;
                return (
                    <div key={key} style={CARD}>
                        <div style={{ width: "100%", display: "flex", alignItems: "stretch", background: "#F2F3FD" }}>
                            <button
                                onClick={() => toggleContactExpanded(key)}
                                style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: movil ? "0.85rem 1rem" : "1rem 1.25rem", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                    <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#DAE2FD", color: "#0058BE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{cg.contact ? "person" : "help_outline"}</span>
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: movil ? "0.85rem" : "0.95rem", color: "#191B23", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {cg.contact || "Sin contacto"}
                                        </div>
                                        <div style={{ fontSize: "0.68rem", color: "#727785" }}>
                                            {cg.items.length} registro{cg.items.length !== 1 ? "s" : ""}{contactPhone ? ` · ${contactPhone}` : ""}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: movil ? "8px" : "14px", flexShrink: 0 }}>
                                    {cg.totalDebo > 0 && (
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#BA1A1A", textTransform: "uppercase" as const }}>Debo</div>
                                            <div style={{ fontWeight: 700, color: "#BA1A1A", fontSize: movil ? "0.78rem" : "0.85rem", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(cg.totalDebo)}</div>
                                        </div>
                                    )}
                                    {cg.totalMeDeben > 0 && (
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#10B981", textTransform: "uppercase" as const }}>Me deben</div>
                                            <div style={{ fontWeight: 700, color: "#10B981", fontSize: movil ? "0.78rem" : "0.85rem", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(cg.totalMeDeben)}</div>
                                        </div>
                                    )}
                                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#727785", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>expand_more</span>
                                </div>
                            </button>
                            {cg.contact && setContacts && (
                                <button onClick={() => openEditContact(cg.contact)} title="Editar contacto" style={{ background: "none", border: "none", borderLeft: "1px solid #C2C6D6", cursor: "pointer", color: "#727785", padding: "0 14px", display: "flex", alignItems: "center", flexShrink: 0 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>edit</span>
                                </button>
                            )}
                        </div>
                        {isOpen && (
                            <div>
                                {debtos.length > 0 && renderDebtCards(debtos)}
                                {cobros.length > 0 && renderCobroCards(cobros)}
                            </div>
                        )}
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
                            sub: `${debtItems.length} deuda${debtItems.length !== 1 ? "s" : ""} pendiente${debtItems.length !== 1 ? "s" : ""}`,
                            subIcon: "receipt_long", subColor: "#BA1A1A",
                        },
                        {
                            border: "#10B981", label: "Total por Cobrar", icon: "payments",
                            iconColor: "#10B981", amount: totalCobrar, amountColor: "#191B23",
                            sub: `${cobroItems.length} cobro${cobroItems.length !== 1 ? "s" : ""} activo${cobroItems.length !== 1 ? "s" : ""}`,
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
                    <div style={{ marginLeft: movil ? undefined : "auto", display: "flex", gap: "6px", width: movil ? "100%" : undefined }}>
                        <button
                            onClick={() => setViewMode(v => v === "contacto" ? "list" : "contacto")}
                            style={{ padding: "6px 10px", borderRadius: "8px", border: "none", background: viewMode === "contacto" ? "#fff" : "transparent", boxShadow: viewMode === "contacto" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", cursor: "pointer", color: viewMode === "contacto" ? "#0058BE" : "#424754", display: "flex", alignItems: "center", gap: "5px", fontSize: movil ? "0.75rem" : "0.8rem", fontWeight: 700, flex: movil ? 1 : undefined, justifyContent: "center", fontFamily: "inherit" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>group</span>
                            Por contacto
                        </button>
                        {!movil && (
                            <>
                                {(["grid", "list"] as const).map(m => (
                                    <button key={m} onClick={() => setViewMode(m)} style={{ padding: "6px 10px", borderRadius: "8px", border: "none", background: viewMode === m ? "#fff" : "transparent", boxShadow: viewMode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none", cursor: "pointer", color: viewMode === m ? "#0058BE" : "#424754" }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{m === "grid" ? "grid_view" : "list"}</span>
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ── TABLES ── */}
            {viewMode === "contacto" ? renderContactView() : (
                <div style={{ display: "grid", gridTemplateColumns: movil ? "1fr" : "repeat(auto-fit, minmax(380px, 1fr))", gap: movil ? "1.25rem" : "2rem" }}>
                    {filterType !== "cobro" && (
                        <section style={CARD}>
                            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #C2C6D6", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F2F3FD" }}>
                                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#191B23", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span className="material-symbols-outlined" style={{ color: "#BA1A1A", fontSize: "20px" }}>outbox</span>
                                    Deudas (Cuentas por Pagar)
                                </h3>
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
                            </div>
                            {movil ? renderCobroCards(filteredCobros) : renderCobroTable(filteredCobros)}
                        </section>
                    )}
                </div>
            )}

            {/* ── ADD MODAL ── */}
            {/* Portal a <body> + z-index bien por encima de la barra inferior (z-index:999
                en Header.tsx): renderizado inline, esta tarjeta quedaba "atrapada" dentro
                del stacking context del dashboard y la barra de navegación (que sí vive
                cerca de la raíz) terminaba tapando el botón Guardar aunque el modal
                estuviera técnicamente "encima" en el árbol React. */}
            {createPortal(
            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: "fixed", inset: 0, background: "rgba(25,27,35,0.45)", backdropFilter: "blur(4px)", zIndex: 2000 }}
                            onClick={() => setShowAddModal(false)}
                        />
                        <div style={{ position: "fixed", top: `${visualViewport.offsetTop}px`, left: 0, right: 0, height: `${visualViewport.height}px`, zIndex: 2001, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", boxSizing: "border-box", pointerEvents: "none" }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                                style={{ background: "#fff", borderRadius: "16px", padding: movil ? "1.25rem" : "2rem", width: movil ? "92vw" : "min(480px, 90vw)", maxHeight: "100%", overflowY: "auto", boxShadow: "0px 12px 24px rgba(15,23,42,0.12)", pointerEvents: "auto" }}
                            >
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#191B23", fontFamily: "'Inter',sans-serif" }}>{editingTx ? "Editar Deuda / Cobro" : "Agregar Deuda / Cobro"}</h3>
                            <button onClick={() => { setShowAddModal(false); setEditingTx(null); setNewAccountId(""); setNewDueDate(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#727785", padding: "4px" }}>
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
                                { label: "Concepto / Motivo", value: newText, setter: setNewText, placeholder: "Ej: Préstamo, Evento, Factura #123..." },
                                { label: newType === "gasto" ? "Acreedor (opcional)" : "Cliente / Deudor (opcional)", value: newContact, setter: setNewContact, placeholder: "Ej: Carlos M., Mirka...", listId: "aldia-contactos-existentes" },
                                { label: "Monto (S/)", value: newAmount, setter: setNewAmount, placeholder: "0.00" },
                            ].map(field => (
                                <div key={field.label} style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#424754", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.04em", fontFamily: "'Inter',sans-serif" }}>
                                        {field.label}
                                    </label>
                                    <input
                                        type={field.label.includes("Monto") ? "number" : "text"}
                                        value={field.value}
                                        onChange={e => {
                                            field.setter(e.target.value);
                                            // Al elegir un contacto ya conocido (del datalist o tipeado igual),
                                            // se trae su teléfono guardado en vez de dejarlo en blanco.
                                            if (field.listId) {
                                                const match = findContactByName(e.target.value);
                                                if (match) setNewPhone(match.phone || "");
                                            }
                                        }}
                                        placeholder={field.placeholder}
                                        list={field.listId}
                                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #C2C6D6", borderRadius: "8px", fontFamily: "'Inter',sans-serif", fontSize: "0.9rem", color: "#191B23", boxSizing: "border-box" as const, outline: "none" }}
                                        onFocus={e => (e.target.style.borderColor = "#0058BE")}
                                        onBlur={e => (e.target.style.borderColor = "#C2C6D6")}
                                    />
                                    {field.listId && (
                                        <datalist id={field.listId}>
                                            {uniqueContacts.map(c => <option key={c} value={c} />)}
                                        </datalist>
                                    )}
                                    {field.listId && newContact.trim() && (
                                        <input
                                            type="tel"
                                            value={newPhone}
                                            onChange={e => setNewPhone(e.target.value)}
                                            placeholder="Teléfono de este contacto (opcional)"
                                            style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #C2C6D6", borderRadius: "8px", fontFamily: "'Inter',sans-serif", fontSize: "0.8rem", color: "#191B23", boxSizing: "border-box" as const, outline: "none" }}
                                            onFocus={e => (e.target.style.borderColor = "#0058BE")}
                                            onBlur={e => (e.target.style.borderColor = "#C2C6D6")}
                                        />
                                    )}
                                </div>
                            ))}

                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#424754", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.04em", fontFamily: "'Inter',sans-serif" }}>
                                    Detalle (opcional)
                                </label>
                                <textarea
                                    value={newNotes}
                                    onChange={e => setNewNotes(e.target.value)}
                                    placeholder="Ej: quedamos en pagar en 3 partes, primera el 15..."
                                    rows={2}
                                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #C2C6D6", borderRadius: "8px", fontFamily: "'Inter',sans-serif", fontSize: "0.85rem", color: "#191B23", boxSizing: "border-box" as const, outline: "none", resize: "vertical" }}
                                    onFocus={e => (e.target.style.borderColor = "#0058BE")}
                                    onBlur={e => (e.target.style.borderColor = "#C2C6D6")}
                                />
                            </div>

                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#424754", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.04em", fontFamily: "'Inter',sans-serif" }}>
                                    Fecha límite (opcional)
                                </label>
                                <input
                                    type="date"
                                    value={newDueDate}
                                    onChange={e => setNewDueDate(e.target.value)}
                                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #C2C6D6", borderRadius: "8px", fontFamily: "'Inter',sans-serif", fontSize: "0.9rem", color: "#191B23", boxSizing: "border-box" as const, outline: "none" }}
                                />
                            </div>

                            {editingTx && (
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#424754", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.04em", fontFamily: "'Inter',sans-serif" }}>
                                        ¿A qué cuenta pertenece? (referencia)
                                    </label>
                                    <select
                                        value={newAccountId}
                                        onChange={e => setNewAccountId(e.target.value)}
                                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #C2C6D6", borderRadius: "8px", fontFamily: "'Inter',sans-serif", fontSize: "0.9rem", color: "#191B23", boxSizing: "border-box" as const, outline: "none", background: "#fff" }}
                                    >
                                        <option value="">Sin cuenta asignada</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                        ))}
                                    </select>
                                    <p style={{ margin: "6px 0 0", fontSize: "0.7rem", color: "#424754" }}>
                                        Solo cambia la referencia — para mover efectivo de verdad usa "Abonar".
                                    </p>
                                </div>
                            )}

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
                                <button onClick={() => { setShowAddModal(false); setEditingTx(null); setNewAccountId(""); setNewDueDate(""); }} style={{ ...BTN_SECONDARY, flex: 1, justifyContent: "center" }}>Cancelar</button>
                                <button onClick={editingTx ? handleSaveEdit : handleAdd} style={{ ...BTN_PRIMARY, flex: 1, justifyContent: "center" }}>{editingTx ? "Guardar Cambios" : "Guardar"}</button>
                            </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>,
            document.body
            )}

            {/* ── EDIT CONTACT MODAL ── */}
            {createPortal(
            <AnimatePresence>
                {editingContact && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: "fixed", inset: 0, background: "rgba(25,27,35,0.45)", backdropFilter: "blur(4px)", zIndex: 2000 }}
                            onClick={() => setEditingContact(null)}
                        />
                        <div style={{ position: "fixed", top: `${visualViewport.offsetTop}px`, left: 0, right: 0, height: `${visualViewport.height}px`, zIndex: 2001, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", boxSizing: "border-box", pointerEvents: "none" }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                                style={{ background: "#fff", borderRadius: "16px", padding: movil ? "1.25rem" : "1.75rem", width: movil ? "92vw" : "min(380px, 90vw)", maxHeight: "100%", overflowY: "auto", boxShadow: "0px 12px 24px rgba(15,23,42,0.12)", pointerEvents: "auto" }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#191B23", fontFamily: "'Inter',sans-serif" }}>{editingContact.name}</h3>
                                    <button onClick={() => setEditingContact(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#727785", padding: "4px" }}>
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#424754", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.04em", fontFamily: "'Inter',sans-serif" }}>
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        value={editContactPhone}
                                        onChange={e => setEditContactPhone(e.target.value)}
                                        placeholder="Ej: 987 654 321"
                                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #C2C6D6", borderRadius: "8px", fontFamily: "'Inter',sans-serif", fontSize: "0.9rem", color: "#191B23", boxSizing: "border-box" as const, outline: "none" }}
                                        onFocus={e => (e.target.style.borderColor = "#0058BE")}
                                        onBlur={e => (e.target.style.borderColor = "#C2C6D6")}
                                    />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#424754", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.04em", fontFamily: "'Inter',sans-serif" }}>
                                        Notas (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={editContactNotes}
                                        onChange={e => setEditContactNotes(e.target.value)}
                                        placeholder="Ej: compañero de trabajo"
                                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #C2C6D6", borderRadius: "8px", fontFamily: "'Inter',sans-serif", fontSize: "0.9rem", color: "#191B23", boxSizing: "border-box" as const, outline: "none" }}
                                        onFocus={e => (e.target.style.borderColor = "#0058BE")}
                                        onBlur={e => (e.target.style.borderColor = "#C2C6D6")}
                                    />
                                </div>
                                <div style={{ display: "flex", gap: "8px", marginTop: "1.5rem" }}>
                                    <button onClick={() => setEditingContact(null)} style={{ ...BTN_SECONDARY, flex: 1, justifyContent: "center" }}>Cancelar</button>
                                    <button onClick={saveEditContact} style={{ ...BTN_PRIMARY, flex: 1, justifyContent: "center" }}>Guardar</button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>,
            document.body
            )}

            <ConfirmDialog
                open={!!confirmDeleteItem}
                title={confirmDeleteItem?.isOwe ? "Eliminar deuda" : "Eliminar cobro"}
                message={confirmDeleteItem ? `¿Eliminar "${confirmDeleteItem.contact || confirmDeleteItem.name}" por S/ ${confirmDeleteItem.amount.toFixed(2)}? También se pierde el registro de sus abonos asociados.` : ""}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={confirmDeleteNow}
                onCancel={() => setConfirmDeleteItem(null)}
            />
        </div>
    );
};
