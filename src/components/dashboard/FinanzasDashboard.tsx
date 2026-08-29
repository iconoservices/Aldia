import { useState, useMemo, useEffect } from "react";
import {
    Wallet, Plus, TrendingUp, TrendingDown,
    Trash2, Edit2, PieChart, X,
    PiggyBank, ArrowDownCircle,
    Tag, MoreVertical, Merge, ArrowLeftRight,
    ChevronLeft, ChevronRight, Layers
} from "lucide-react";
import { AnalyticsView } from "./AnalyticsView";
import { motion, AnimatePresence } from "framer-motion";
import { ProjectDetailView } from "./ProjectDetailView";
import type { Transaction, FixedExpense, Project, Routine, UserPreferences, Account } from "../../hooks/useAlDiaState";
import { getPeriodKey } from "../../hooks/useAlDiaState";
import { C, bento, etiqueta, useIsMobile, paddingPagina, tituloPagina, subtituloPagina, botonPrimario, TOQUE_MINIMO } from "../../theme";
import { RegistroMovimiento } from "../features/RegistroMovimiento";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { PLANTILLAS, PLANTILLA_IDS, type PlantillaId } from "../../lib/plantillasFinanzas";

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
    rolloverFixedExpenses: () => void;
    repayDebt: (originalTx: Transaction, amount: number, accountId: number) => void;
    updateTransaction: (id: number, updates: Partial<Transaction>) => void;
    updateTransactionGroup: (oldText: string, oldContact: string | undefined, updates: { text?: string, contact?: string, amount?: number }, originalId: number) => void;
    addTransaction: (text: string, amount: number, type: "ingreso" | "gasto", isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean, category?: string, contact?: string) => void;
    projects: Project[];
    accounts: Account[];
    setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
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
    onNavigate?: (tab: string) => void;
    incomeCategories?: string[];
    expenseCategories?: string[];
    addCategory?: (type: "ingreso" | "gasto", name: string) => void;
    removeCategory?: (type: "ingreso" | "gasto", name: string) => void;
    renameCategory?: (type: "ingreso" | "gasto", oldName: string, newName: string) => void;
    mergeCategory?: (type: "ingreso" | "gasto", sourceName: string, targetName: string) => void;
    categoryAccountScope?: { ingreso: Record<string, number[]>; gasto: Record<string, number[]> };
    setCategoryAccounts?: (type: "ingreso" | "gasto", name: string, accountIds: number[]) => void;
    categoryGroups?: { ingreso: Record<string, string>; gasto: Record<string, string> };
    setCategoryGroup?: (type: "ingreso" | "gasto", name: string, groupName: string | null) => void;
    categoryDescriptions?: { ingreso: Record<string, string>; gasto: Record<string, string> };
    setCategoryDescription?: (type: "ingreso" | "gasto", name: string, desc: string) => void;
    renameCategoryGroup?: (type: "ingreso" | "gasto", oldGroupName: string, newGroupName: string) => void;
    deleteCategoryGroup?: (type: "ingreso" | "gasto", groupName: string) => void;
    groupAccountScope?: { ingreso: Record<string, number[]>; gasto: Record<string, number[]> };
    setGroupAccounts?: (type: "ingreso" | "gasto", groupName: string, accountIds: number[]) => void;
    aplicarPlantilla?: (accountId: number, plantillaId: PlantillaId) => void;
}

export type PeriodMode = "day" | "week" | "month" | "quarter" | "year" | "all";
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

// Celda chica con label arriba y monto abajo: en fila angosta (celular) tres montos
// pegados uno al lado del otro se cortaban a la mitad del número. Apilar label+valor
// en columna dentro de un grid de 3 evita ese corte sin sacrificar los tres datos.
const MoneyMini = ({ label, val, color, prefix = "S/ ", title: tip }: { label: string; val: number; color: string; prefix?: string; title?: string }) => (
    <div title={tip} style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: "0.56rem", fontWeight: 700, color: C.outline, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</span>
        <span style={{ fontSize: "0.75rem", fontWeight: 900, color, whiteSpace: "nowrap" }}>
            {prefix}{val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
    </div>
);

// Desglose de categorías al expandir una fila de cuenta en "Ingresos y Gastos por
// Cuenta": barra proporcional al gasto más alto de esa cuenta, para ver de un
// vistazo en qué se fue la plata sin tener que ir a Movimientos a buscarlo.
const CategoryBreakdown = ({ items }: { items: { category: string; amount: number }[] }) => {
    if (items.length === 0) {
        return <div style={{ padding: "10px 4px", fontSize: "0.72rem", color: C.outline, fontStyle: "italic" }}>Sin gastos con categoría en este período.</div>;
    }
    const max = Math.max(...items.map(i => i.amount));
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "7px", padding: "10px 4px 2px" }}>
            {items.map(({ category, amount }) => (
                <div key={category} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ fontSize: "0.74rem", fontWeight: 700, color: C.onSurface, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{category}</span>
                        <span style={{ fontSize: "0.74rem", fontWeight: 800, color: C.rojo, whiteSpace: "nowrap" }}>−S/ {amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ height: "5px", borderRadius: "999px", background: C.surfaceContainer, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "999px", width: `${max > 0 ? (amount / max) * 100 : 0}%`, background: C.rojo, opacity: 0.75 }} />
                    </div>
                </div>
            ))}
        </div>
    );
};

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
    plantillaActual, onAplicarPlantilla,
}: {
    account: { id: number; name: string; color: string; balance: number; projectIds?: number[] };
    transactions: Transaction[];
    projects: Project[];
    onClose: () => void;
    onRename: (name: string) => void;
    onChangeColor: (color: string) => void;
    onDelete: () => void;
    plantillaActual?: PlantillaId;
    onAplicarPlantilla?: (id: PlantillaId) => void;
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
                        {plantillaActual && !editingName && (
                            <span style={{ flexShrink: 0, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", color: C.secondary, background: `${C.secondary}14`, borderRadius: "999px", padding: "2px 8px" }}>
                                {PLANTILLAS[plantillaActual].label}
                            </span>
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
                                        {onAplicarPlantilla && (
                                            <div style={{ borderTop: `1px solid ${C.outlineVariant}` }}>
                                                <div style={{ padding: "8px 14px 4px", fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: C.outline, display: "flex", alignItems: "center", gap: "6px" }}>
                                                    <Layers size={12} /> Aplicar plantilla
                                                </div>
                                                {PLANTILLA_IDS.map(id => (
                                                    <button key={id} onClick={() => {
                                                        setMenuOpen(false);
                                                        if (window.confirm(`Agrega los grupos y categorías de la plantilla "${PLANTILLAS[id].label}" a esta cuenta. No borra nada. ¿Continuar?`)) onAplicarPlantilla(id);
                                                    }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px 8px 20px", background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: C.onSurface, textAlign: "left", fontFamily: "inherit" }}>
                                                        {PLANTILLAS[id].label}
                                                        {plantillaActual === id && <span style={{ fontSize: "0.62rem", color: C.outline, fontWeight: 700 }}>· actual</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
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
    if (mode === "quarter") {
        const q = Math.floor(ref.getMonth() / 3);
        const first = new Date(ref.getFullYear(), q * 3, 1);
        const last = new Date(ref.getFullYear(), q * 3 + 3, 0);
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
    if (mode === "quarter") return `T${Math.floor(ref.getMonth() / 3) + 1} ${ref.getFullYear()}`;
    return String(ref.getFullYear());
}

export function shiftPeriod(mode: PeriodMode, ref: Date, dir: -1 | 1): Date {
    const d = new Date(ref);
    if (mode === "day") d.setDate(d.getDate() + dir);
    if (mode === "week") d.setDate(d.getDate() + dir * 7);
    if (mode === "month") d.setMonth(d.getMonth() + dir);
    if (mode === "quarter") d.setMonth(d.getMonth() + dir * 3);
    if (mode === "year") d.setFullYear(d.getFullYear() + dir);
    return d;
}

// ─── Main component ───────────────────────────────────────────────────────────
export const FinanzasDashboard = ({
    balance, transactions,
    fixedExpenses, rolloverFixedExpenses,
    addTransaction, updateTransaction,
    projects, accounts, setAccounts,
    addProjectTask, toggleProjectTask, removeProjectTask, updateProjectTask,
    reorderProjectTasks, promoteTaskToRoutine, rutinas,
    addProjectCategory, removeProjectCategory,
    addInventoryItem, updateInventoryItemQuantity, removeInventoryItem,
    updateProject,
    preferences,
    onNavigate,
    incomeCategories, expenseCategories, addCategory, removeCategory, renameCategory, mergeCategory,
    categoryAccountScope, setCategoryAccounts,
    categoryGroups, setCategoryGroup, renameCategoryGroup, deleteCategoryGroup,
    categoryDescriptions, setCategoryDescription,
    groupAccountScope, setGroupAccounts,
    aplicarPlantilla,
}: FinanzasProps) => {

    // Migración retroactiva: los pares gasto/ingreso que antes se anotaban a mano con
    // la categoría "AutoSueldo" (el mismo movimiento entre cuentas propias que ahora
    // registra el botón "Transferir") pasan a "Transferencia" para que el Presupuesto
    // real los excluya igual que a los nuevos. Una sola vez; ya migrados, el filtro no
    // vuelve a encontrar nada.
    useEffect(() => {
        const desactualizadas = transactions.filter(t => t.category === "AutoSueldo");
        desactualizadas.forEach(t => updateTransaction(t.id, { category: "Transferencia" }));
    }, [transactions, updateTransaction]);

    // Al entrar a Finanzas, revisa si algún gasto fijo cruzó de período (mes/semana)
    // sin quedar saldado, y lo deja como pendiente marcado con su propio período.
    useEffect(() => {
        rolloverFixedExpenses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Config ────────────────────────────────────────────────────────────
    const [topPeriod, setTopPeriod] = useState<PeriodMode>("month");
    const [periodRef, setPeriodRef] = useState<Date>(new Date());
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

    const todayStr = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

    const fixedExpensePaidTotal = useMemo(() =>
        fixedExpenses.filter(e => e.active).reduce((a, e) => {
            const period = getPeriodKey(e.frequency, todayStr);
            return a + (e.lastPaidMonth === period ? e.amount : (e.partialPaid?.month === period ? e.partialPaid.amount : 0));
        }, 0),
        [fixedExpenses, todayStr]);

    // ── Fixed incomes (stored in preferences as JSON; el CRUD vive en la pestaña
    // "Gastos Fijos" — acá solo se lee para las proyecciones Real/Simulador) ────
    type FixedIncomeItem = { id: number; name: string; amount: number; active: boolean; accountId?: number; frequency?: 'monthly' | 'weekly'; dueDay?: number; dueWeekday?: number; lastReceivedMonth?: string; partialReceived?: { month: string; amount: number } };
    const fixedIncomeItems: FixedIncomeItem[] = useMemo(() => {
        try { return JSON.parse(preferences.fixedIncomes || "[]"); } catch { return []; }
    }, [preferences.fixedIncomes]);

    const toggleDebtActive = (key: string) => setDebtActiveMap(m => ({ ...m, [key]: !(m[key] ?? true) }));
    const [payInputs, setPayInputs] = useState<Record<string, string>>({});
    const [payOpen, setPayOpen] = useState<Record<string, boolean>>({});
    const handlePay = (key: string, amount: number, d: typeof activeDebtsAndCollections[0]) => {
        if (amount <= 0) return;
        const payAccountId = d.originalTx.accountId ?? accounts[0]?.id;
        // Transacción REAL: aparece en topTxs (finanzas) y en periodBalance
        addTransaction(`Pago: ${d.name}`, d.isOwe ? -amount : amount, d.isOwe ? 'gasto' : 'ingreso', false, undefined, payAccountId, false, 'Deudas', d.contact);
        // Transacción de seguimiento: reduce la deuda en el grouping, sin afectar balance (isCashless: true).
        // El tipo va INVERTIDO a propósito — activeDebtsAndCollections agrupa transacciones sin garantía
        // de orden (el array es más-reciente-primero) y deduce isOwe tanto desde el original como desde
        // el pago; para que ambos caminos den el mismo resultado, el pago debe tener el tipo opuesto al
        // original. Si aquí usa el mismo tipo, la deuda salta de "Debo" a "Me deben" al abonar.
        addTransaction(`Pago: ${d.name}`, d.isOwe ? -amount : amount, d.isOwe ? 'ingreso' : 'gasto', true, undefined, undefined, true, 'Deudas', d.contact);
        setPayInputs(m => ({ ...m, [key]: '' }));
        setPayOpen(m => ({ ...m, [key]: false }));
    };
    const periodBalance = useMemo(() => {
        if (topPeriod === "all") return balance;
        const { start, end } = getPeriodBounds(topPeriod, periodRef);
        return transactions
            .filter(tx => !tx.isCashless && tx.fullDate >= start && tx.fullDate <= end)
            .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    }, [transactions, topPeriod, periodRef, balance]);

    // Excluye "Transferencia": mover plata entre cuentas propias no es ingreso
    // ni gasto real a nivel global (aunque sí lo es a nivel de cada cuenta, ver
    // accountsBudget). Sin este filtro, cada transferencia infla Ingresos Y
    // Gastos del período por el mismo monto, aunque el Balance Neto no cambie.
    const topTxs = useMemo(() => {
        const { start, end } = getPeriodBounds(topPeriod, periodRef);
        return transactions.filter(tx => !tx.isDebt && tx.category !== "Transferencia" && tx.fullDate >= start && tx.fullDate <= end);
    }, [transactions, topPeriod, periodRef]);

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
        if (topPeriod === "quarter") return fixedExpensePaidTotal * 3;
        if (topPeriod === "year") return fixedExpensePaidTotal * 12;
        return fixedExpensePaidTotal;
    }, [topPeriod, fixedExpensePaidTotal]);

    const variableExpenseActual = useMemo(() => topExpense - fixedExpenseActual, [topExpense, fixedExpenseActual]);

    const topPeriodDetails = useMemo(() => {
        const mapping = {
            day: { label: "Ingresos (Día)", labelExp: "Gastos (Día)", sub: "Recibido hoy", subExp: "Gastado hoy" },
            week: { label: "Ingresos (Sem.)", labelExp: "Gastos (Sem.)", sub: "Recibido sem.", subExp: "Gastado sem." },
            month: { label: "Ingresos (Mes)", labelExp: "Gastos (Mes)", sub: "Recibido real", subExp: "Gastado real" },
            quarter: { label: "Ingresos (Trim.)", labelExp: "Gastos (Trim.)", sub: "Recibido trim.", subExp: "Gastado trim." },
            year: { label: "Ingresos (Año)", labelExp: "Gastos (Año)", sub: "Recibido año", subExp: "Gastado año" },
            all: { label: "Ingresos (Total)", labelExp: "Gastos (Total)", sub: "Historial total", subExp: "Historial total" },
        };
        return mapping[topPeriod];
    }, [topPeriod]);

    // ── UI state ──────────────────────────────────────────────────────────
    const movil = useIsMobile();
    // El alta de movimiento se dispara desde el botón de la cabecera.
    const [showTxForm, setShowTxForm] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);

    // ── Accounts ──────────────────────────────────────────────────────────
    const accountsWithBalance = useMemo(() =>
        accounts.map(acc => ({
            ...acc,
            balance: transactions.filter(tx => tx.accountId === acc.id && !tx.isCashless).reduce((s, tx) => s + (Number(tx.amount) || 0), 0)
        })), [accounts, transactions]);

    // "Presupuesto real" por cuenta: ingreso genuino (sin transferencias que llegan de otra
    // cuenta, esas no son plata ganada) menos todo lo gastado (una transferencia SALIENTE sí
    // cuenta como gasto real, porque esa cuenta sí perdió el dinero). Atado al selector grande
    // de arriba (Día/Sem/Mes/Año/Todo), el mismo que ya usa el resto de la página.
    const accountsBudget = useMemo(() => {
        const { start, end } = getPeriodBounds(topPeriod, periodRef);
        return accounts.map(acc => {
            const inPeriod = transactions.filter(tx => tx.accountId === acc.id && !tx.isCashless && tx.fullDate >= start && tx.fullDate <= end);
            const ingresoReal = inPeriod.filter(tx => tx.type === "ingreso" && tx.category !== "Transferencia").reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
            const gastoTotal = inPeriod.filter(tx => tx.type === "gasto").reduce((s, tx) => s + Math.abs(Number(tx.amount) || 0), 0);
            // Cuánto de ese movimiento (entrada o salida) fue plata que solo cambió de cuenta,
            // no gasto real ni ingreso nuevo — se muestra aparte para no confundirlo con lo demás.
            const transferTotal = inPeriod.filter(tx => tx.category === "Transferencia").reduce((s, tx) => s + Math.abs(Number(tx.amount) || 0), 0);
            // De gastoTotal, la parte que salió como transferencia hacia otra cuenta (no se gastó,
            // solo cambió de bolsillo). Restándola queda lo que la cuenta gastó de verdad.
            const gastoTransferSaliente = inPeriod.filter(tx => tx.type === "gasto" && tx.category === "Transferencia").reduce((s, tx) => s + Math.abs(Number(tx.amount) || 0), 0);
            const gastoPuro = gastoTotal - gastoTransferSaliente;
            return { id: acc.id, remaining: ingresoReal - gastoTotal, ingresoReal, gastoTotal, transferTotal, gastoPuro };
        });
    }, [accounts, transactions, topPeriod, periodRef]);

    // Desglose por categoría del gasto real de cada cuenta, en el mismo período de arriba.
    // Se usa para expandir la fila de una cuenta en "Ingresos y Gastos por Cuenta" y ver
    // en qué se fue la plata sin tener que ir a buscarlo en Movimientos.
    const accountCategoryBreakdown = useMemo(() => {
        const { start, end } = getPeriodBounds(topPeriod, periodRef);
        const map = new Map<number, { category: string; amount: number }[]>();
        accounts.forEach(acc => {
            const byCategory = new Map<string, number>();
            transactions
                .filter(tx => tx.accountId === acc.id && !tx.isCashless && tx.type === "gasto" && tx.category !== "Transferencia" && tx.fullDate >= start && tx.fullDate <= end)
                .forEach(tx => {
                    const cat = tx.category || "Sin categoría";
                    byCategory.set(cat, (byCategory.get(cat) || 0) + Math.abs(Number(tx.amount) || 0));
                });
            map.set(acc.id, [...byCategory.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount));
        });
        return map;
    }, [accounts, transactions, topPeriod, periodRef]);
    // Set (no un solo id): las filas de cuenta se expanden independientemente,
    // abrir una no debe cerrar las demás que ya estaban abiertas.
    const [expandedAccountIds, setExpandedAccountIds] = useState<Set<number>>(new Set());

    // Ganancia real (todas las cuentas juntas) del período inmediatamente anterior al elegido
    // arriba, para poder comparar "este mes vs el anterior" sin agregar un segundo selector.
    // No aplica a "Todo" — no hay un "todo anterior" con el que comparar.
    const previousPeriodGanancia = useMemo(() => {
        if (topPeriod === "all") return null;
        const prevRef = shiftPeriod(topPeriod, periodRef, -1);
        const { start, end } = getPeriodBounds(topPeriod, prevRef);
        const inPeriod = transactions.filter(tx => !tx.isCashless && tx.fullDate >= start && tx.fullDate <= end);
        const ingresoReal = inPeriod.filter(tx => tx.type === "ingreso" && tx.category !== "Transferencia").reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
        const gastoTotal = inPeriod.filter(tx => tx.type === "gasto").reduce((s, tx) => s + Math.abs(Number(tx.amount) || 0), 0);
        const gastoTransferSaliente = inPeriod.filter(tx => tx.type === "gasto" && tx.category === "Transferencia").reduce((s, tx) => s + Math.abs(Number(tx.amount) || 0), 0);
        return ingresoReal - (gastoTotal - gastoTransferSaliente);
    }, [transactions, topPeriod, periodRef]);

    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [newAccountName, setNewAccountName] = useState("");
    const [newAccountColor, setNewAccountColor] = useState("#0055FF");
    const [newAccountPlantilla, setNewAccountPlantilla] = useState<PlantillaId | "">("");
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

    // ── Transferir entre cuentas ──────────────────────────────────────────
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferAmount, setTransferAmount] = useState("");
    const [transferFrom, setTransferFrom] = useState<number | undefined>(undefined);
    const [transferTo, setTransferTo] = useState<number | undefined>(undefined);
    const [transferConcept, setTransferConcept] = useState("");

    const submitTransfer = () => {
        const amt = parseFloat(transferAmount);
        if (!amt || amt <= 0 || !transferFrom || !transferTo || transferFrom === transferTo) return;
        const label = `Transferencia: ${transferConcept.trim() || "entre cuentas"}`;
        addTransaction(label, amt, "gasto", false, undefined, transferFrom, false, "Transferencia");
        addTransaction(label, amt, "ingreso", false, undefined, transferTo, false, "Transferencia");
        setTransferAmount(""); setTransferFrom(undefined); setTransferTo(undefined); setTransferConcept(""); setIsTransferring(false);
    };

    // ── Categorías ────────────────────────────────────────────────────────
    const [isCategoriesVisible, setIsCategoriesVisible] = useState(false);
    // El acordeón necesita overflow:hidden mientras anima su alto (si no, el contenido
    // se ve "saltar" fuera de la caja durante la transición) pero eso mismo recorta
    // cualquier menú desplegable (⋮) que quiera salir del cuadro una vez ya abierto.
    // Se guarda aparte de isCategoriesVisible para poder tener hidden durante la
    // animación y visible solo cuando ya terminó de abrirse.
    const [categoriesOverflowVisible, setCategoriesOverflowVisible] = useState(false);
    const [categoryTab, setCategoryTab] = useState<"gasto" | "ingreso">("gasto");
    // Filtro de cuenta en el administrador de Categorías: "all" = todo agrupado
    // por cuenta; un id = solo lo de esa cuenta + lo compartido (y lo nuevo nace
    // marcado para ella).
    const [catAccountView, setCatAccountView] = useState<number | "all">("all");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(null);
    const [categoryMenuMode, setCategoryMenuMode] = useState<"root" | "merge" | "accounts" | "group" | "desc">("root");
    const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState("");
    const [descDraft, setDescDraft] = useState("");
    const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<string | null>(null);
    const [groupDraft, setGroupDraft] = useState("");
    const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
    const [groupRenameDraft, setGroupRenameDraft] = useState("");
    const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<string | null>(null);
    const [activeGroupMenu, setActiveGroupMenu] = useState<string | null>(null);
    const [groupMenuMode, setGroupMenuMode] = useState<"root" | "accounts">("root");
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [groupCategoryTarget, setGroupCategoryTarget] = useState("");
    const [addingCategoryToGroup, setAddingCategoryToGroup] = useState<string | null>(null);
    const [newCategoryForGroupDraft, setNewCategoryForGroupDraft] = useState("");
    const currentCategoriesForTab = useMemo(() => (categoryTab === "gasto" ? expenseCategories : incomeCategories) || [], [categoryTab, expenseCategories, incomeCategories]);

    const handleAddCategory = () => {
        const n = newCategoryName.trim();
        if (!n || !addCategory) return;
        addCategory(categoryTab, n);
        if (typeof catAccountView === "number") setCategoryAccounts?.(categoryTab, n, [catAccountView]);
        setNewCategoryName("");
    };

    const closeCategoryMenu = () => { setActiveMenuCategory(null); setCategoryMenuMode("root"); setGroupDraft(""); };

    const handleAssignGroup = (cat: string, groupName: string) => {
        setCategoryGroup?.(categoryTab, cat, groupName);
        closeCategoryMenu();
    };

    const handleCreateGroupForCategory = (cat: string) => {
        const trimmed = groupDraft.trim();
        if (!trimmed) return;
        setCategoryGroup?.(categoryTab, cat, trimmed);
        if (typeof catAccountView === "number") setGroupAccounts?.(categoryTab, trimmed, [catAccountView]);
        setGroupDraft("");
        closeCategoryMenu();
    };

    const handleRemoveFromGroup = (cat: string) => {
        setCategoryGroup?.(categoryTab, cat, null);
        closeCategoryMenu();
    };

    // Botón "+ Grupo" suelto (no colgado del menú de una categoría puntual): pide
    // qué categoría mover y el nombre del grupo en la misma línea compacta.
    const handleCreateStandaloneGroup = () => {
        const trimmed = groupDraft.trim();
        if (!trimmed || !groupCategoryTarget || !setCategoryGroup) return;
        setCategoryGroup(categoryTab, groupCategoryTarget, trimmed);
        if (typeof catAccountView === "number") setGroupAccounts?.(categoryTab, trimmed, [catAccountView]);
        setGroupDraft("");
        setGroupCategoryTarget("");
        setIsAddingGroup(false);
    };

    // Un grupo es, ante todo, un conjunto de categorías: además de mover una
    // categoría ya existente hacia él, cada grupo tiene su propio "+" para crear
    // una categoría nueva que nace directamente adentro.
    const handleAddCategoryToGroup = (group: string) => {
        const trimmed = newCategoryForGroupDraft.trim();
        if (!trimmed || !addCategory) return;
        addCategory(categoryTab, trimmed);
        setCategoryGroup?.(categoryTab, trimmed, group);
        if (typeof catAccountView === "number") setCategoryAccounts?.(categoryTab, trimmed, [catAccountView]);
        setNewCategoryForGroupDraft("");
        setAddingCategoryToGroup(null);
    };

    const startRenameGroup = (name: string) => { setGroupRenameDraft(name); setEditingGroupName(name); };

    const saveRenameGroup = () => {
        const trimmed = groupRenameDraft.trim();
        if (editingGroupName && renameCategoryGroup && trimmed && trimmed !== editingGroupName) {
            renameCategoryGroup(categoryTab, editingGroupName, trimmed);
        }
        setEditingGroupName(null);
    };

    const handleConfirmDeleteGroup = () => {
        if (confirmDeleteGroup) deleteCategoryGroup?.(categoryTab, confirmDeleteGroup);
        setConfirmDeleteGroup(null);
    };

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
        const id = Date.now();
        setAccounts(prev => [...prev, { id, name: newAccountName, color: newAccountColor, projectIds: [] }]);
        if (newAccountPlantilla) aplicarPlantilla?.(id, newAccountPlantilla);
        setNewAccountName(""); setNewAccountPlantilla(""); setIsAddingAccount(false);
    };

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


    return (
        <div style={{
            display: "flex", flexDirection: "column",
            gap: movil ? "1rem" : "1.5rem",
            ...paddingPagina(movil),
            color: "var(--text-carbon)",
        }}>

            {/* ── Cabecera: título, vista, periodo y acción ─── */}
            {!showAnalytics && (() => {
                const periodPillsAndRegistrar = (
                    <div style={{
                        display: "flex", alignItems: "center", gap: movil ? "8px" : "10px", flexWrap: "nowrap",
                        justifyContent: movil ? "space-between" : undefined,
                    }}>
                        <div style={{ display: "flex", background: C.surfaceContainerLow, borderRadius: "999px", padding: "3px", border: `1px solid ${C.outlineVariant}`, overflowX: movil ? "auto" : undefined, minWidth: 0, flexShrink: movil ? 1 : undefined }}>
                            {(["day", "week", "month", "quarter", "year", "all"] as PeriodMode[]).map(mode => {
                                const etiquetas: Record<PeriodMode, string> = { day: "Día", week: "Sem", month: "Mes", quarter: "Trim", year: "Año", all: "Todo" };
                                const activo = topPeriod === mode;
                                return (
                                    <button
                                        key={mode}
                                        onClick={() => { setTopPeriod(mode); setPeriodRef(new Date()); }}
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
                            Lo que ya pasó · {periodLabel(topPeriod, periodRef)}
                        </p>
                        {topPeriod !== "all" && (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                                <button onClick={() => setPeriodRef(d => shiftPeriod(topPeriod, d, -1))} style={{ background: "none", border: "none", cursor: "pointer", color: C.onSurfaceVariant, display: "flex", padding: "2px" }}><ChevronLeft size={15} /></button>
                                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: C.onSurfaceVariant, textTransform: "capitalize" }}>{periodLabel(topPeriod, periodRef)}</span>
                                <button onClick={() => setPeriodRef(d => shiftPeriod(topPeriod, d, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: C.onSurfaceVariant, display: "flex", padding: "2px" }}><ChevronRight size={15} /></button>
                            </div>
                        )}
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

                // Cabecera de escritorio, compacta y en una sola fila —
                // mismo lenguaje visual que la cabecera de Analizar (tarjeta
                // blanca angosta) en vez del título grande + subtítulo de antes,
                // para que ambas vistas se sientan como la misma pantalla.
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "nowrap", background: "white", padding: "10px 14px", borderRadius: "18px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
                        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 900, color: C.onSurface, whiteSpace: "nowrap", flexShrink: 0 }}>Finanzas</h2>

                        {/* Este grupo (pills de período + navegador de fecha) es el único
                            que se encoge y scrollea si falta espacio — así Registrar y
                            Analizar (el toggle) nunca terminan empujados a una segunda
                            línea más abajo; siempre quedan en la misma fila que el título. */}
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: "1 1 auto", overflowX: "auto" }}>
                            <div style={{ display: "flex", background: C.surfaceContainerLow, borderRadius: "999px", padding: "3px", border: `1px solid ${C.outlineVariant}`, flexShrink: 0 }}>
                                {(["day", "week", "month", "quarter", "year", "all"] as PeriodMode[]).map(mode => {
                                    const etiquetas: Record<PeriodMode, string> = { day: "Día", week: "Sem", month: "Mes", quarter: "Trim", year: "Año", all: "Todo" };
                                    const activo = topPeriod === mode;
                                    return (
                                        <button
                                            key={mode}
                                            onClick={() => { setTopPeriod(mode); setPeriodRef(new Date()); }}
                                            style={{
                                                border: "none", borderRadius: "999px", cursor: "pointer", flexShrink: 0,
                                                padding: "5px 13px", fontSize: "0.75rem", fontWeight: 700,
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

                            {topPeriod !== "all" && (
                                <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                                    <button onClick={() => setPeriodRef(d => shiftPeriod(topPeriod, d, -1))} style={{ background: "none", border: "none", cursor: "pointer", color: C.onSurfaceVariant, display: "flex", padding: "2px" }}><ChevronLeft size={16} /></button>
                                    <span style={{ fontSize: "0.8rem", fontWeight: 900, color: C.onSurface, textTransform: "capitalize", whiteSpace: "nowrap" }}>{periodLabel(topPeriod, periodRef)}</span>
                                    <button onClick={() => setPeriodRef(d => shiftPeriod(topPeriod, d, 1))} style={{ background: "none", border: "none", cursor: "pointer", color: C.onSurfaceVariant, display: "flex", padding: "2px" }}><ChevronRight size={16} /></button>
                                </div>
                            )}
                        </div>

                        {/* marginLeft: auto en el toggle (no en Registrar) para que quede
                            siempre pegado a la esquina derecha — la misma posición fija
                            que ocupa "Finanzas" en la cabecera de Analizar, en vez de
                            saltar de lugar según qué botones haya alrededor. */}
                        {/* Mismo padding y tamaño de fuente que los pills de al lado
                            (Analizar, período) — botonPrimario solo, sin ajustar, quedaba
                            visiblemente más alto que el resto de la fila. */}
                        <button onClick={() => setShowTxForm(v => !v)} style={{ ...botonPrimario(movil), padding: "8px 14px", fontSize: "0.78rem", marginLeft: "auto", flexShrink: 0 }}>
                            <Plus size={15} /> Registrar
                        </button>

                        <button
                            onClick={() => setShowAnalytics(true)}
                            title="Analizar"
                            style={{
                                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                                background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`,
                                borderRadius: "999px", cursor: "pointer", flexShrink: 0,
                                padding: "8px 14px",
                                fontSize: "0.78rem", fontWeight: 700, color: C.secondary, fontFamily: "inherit",
                            }}
                        >
                            <PieChart size={15} /> Analizar
                        </button>
                    </div>
                );
            })()}

            {showAnalytics ? (
                <AnalyticsView transactions={transactions} onClose={() => setShowAnalytics(false)} owe={realOwe} owed={realOwed} accounts={accounts} categoryGroups={categoryGroups} />
            ) : (
            <>
            {/* Modal de alta, el mismo que usa Checklist: mismos campos, mismo aspecto */}
            <RegistroMovimiento
                open={showTxForm}
                onClose={() => setShowTxForm(false)}
                addTransaction={addTransaction}
                accounts={accounts}
                incomeCategories={incomeCategories}
                expenseCategories={expenseCategories}
                categoryAccountScope={categoryAccountScope}
                categoryGroups={categoryGroups}
                groupAccountScope={groupAccountScope}
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
                        {accounts.length > 1 && (
                            <button
                                onClick={() => setIsTransferring(v => !v)}
                                title="Transferir entre cuentas"
                                style={{
                                    display: "flex", alignItems: "center", gap: "4px", justifyContent: "center",
                                    padding: "3px 8px", borderRadius: "999px",
                                    border: `1px solid ${C.outlineVariant}`, background: "transparent",
                                    color: C.onSurfaceVariant, cursor: "pointer", fontSize: "0.65rem", fontWeight: 700,
                                }}
                            >
                                <ArrowLeftRight size={11} /> Transferir
                            </button>
                        )}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                        <span style={{ fontSize: "0.65rem", color: C.onSurfaceVariant, fontWeight: 700 }}>Total:</span>
                        <span style={{ fontSize: "1rem", fontWeight: 900, color: C.secondary }}>
                            S/ {accountsWithBalance.reduce((s, a) => s + a.balance, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {isAddingAccount && (
                    <div style={{ borderRadius: movil ? "10px" : "14px", padding: movil ? "8px" : "12px", border: `1px solid ${C.secondary}`, background: C.surface, display: "flex", flexDirection: "column", gap: "6px", marginBottom: movil ? "8px" : "12px" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <input autoFocus placeholder="Nombre de la cuenta" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddAccount()} style={{ flex: 1, minWidth: 0, padding: "6px 8px", borderRadius: "6px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.75rem", outline: "none" }} />
                            <input type="color" value={newAccountColor} onChange={e => setNewAccountColor(e.target.value)} style={{ width: "28px", height: "28px", borderRadius: "6px", border: `1px solid ${C.outlineVariant}`, padding: "1px", cursor: "pointer", flexShrink: 0 }} />
                            <button onClick={handleAddAccount} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "6px", padding: "6px 10px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>OK</button>
                            <button onClick={() => setIsAddingAccount(false)} style={{ background: C.outlineVariant, color: C.onSurfaceVariant, border: "none", borderRadius: "6px", padding: "6px 8px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>X</button>
                        </div>
                        {aplicarPlantilla && (
                            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.68rem", fontWeight: 700, color: C.onSurfaceVariant }}>
                                Plantilla
                                <select value={newAccountPlantilla} onChange={e => setNewAccountPlantilla(e.target.value as PlantillaId | "")} style={{ flex: 1, padding: "5px 8px", borderRadius: "6px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.72rem", fontWeight: 700, background: "white", cursor: "pointer" }}>
                                    <option value="">Sin plantilla</option>
                                    {PLANTILLA_IDS.map(id => <option key={id} value={id}>{PLANTILLAS[id].label}</option>)}
                                </select>
                            </label>
                        )}
                    </div>
                )}

                {isTransferring && (
                    <div style={{ borderRadius: movil ? "10px" : "14px", padding: movil ? "8px" : "12px", border: `1px solid ${C.secondary}`, background: C.surface, display: "flex", flexDirection: "column", gap: "8px", marginBottom: movil ? "8px" : "12px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            <div>
                                <label style={feLabelStyle}>De</label>
                                <select value={transferFrom ?? ""} onChange={e => setTransferFrom(e.target.value ? Number(e.target.value) : undefined)} style={{ ...feInputStyle, fontWeight: 700, cursor: "pointer" }}>
                                    <option value="">Cuenta origen</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={feLabelStyle}>A</label>
                                <select value={transferTo ?? ""} onChange={e => setTransferTo(e.target.value ? Number(e.target.value) : undefined)} style={{ ...feInputStyle, fontWeight: 700, cursor: "pointer" }}>
                                    <option value="">Cuenta destino</option>
                                    {accounts.filter(a => a.id !== transferFrom).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px" }}>
                            <div>
                                <label style={feLabelStyle}>Monto</label>
                                <input type="number" placeholder="0.00" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} onKeyDown={e => e.key === "Enter" && submitTransfer()} style={feInputStyle} />
                            </div>
                            <div>
                                <label style={feLabelStyle}>Concepto (opcional)</label>
                                <input placeholder="Ej. pago semanal" value={transferConcept} onChange={e => setTransferConcept(e.target.value)} onKeyDown={e => e.key === "Enter" && submitTransfer()} style={feInputStyle} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button onClick={() => { setIsTransferring(false); setTransferAmount(""); setTransferFrom(undefined); setTransferTo(undefined); setTransferConcept(""); }} style={{ background: "none", border: `1px solid ${C.outlineVariant}`, color: C.onSurfaceVariant, borderRadius: "9px", padding: "7px 14px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Cancelar</button>
                            <button onClick={submitTransfer} disabled={!transferAmount || !transferFrom || !transferTo} style={{ background: (transferAmount && transferFrom && transferTo) ? C.secondary : C.outlineVariant, color: "white", border: "none", borderRadius: "9px", padding: "7px 14px", fontWeight: 800, fontSize: "0.78rem", cursor: (transferAmount && transferFrom && transferTo) ? "pointer" : "not-allowed" }}>Transferir</button>
                        </div>
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

            {/* ── Ingresos y Gastos por Cuenta: lista directa de cuánto entró (sin
                transferencias) y cuánto salió de cada cuenta en el período elegido arriba ─── */}
            {accountsWithBalance.length > 0 && (() => {
                const desktopCols = "minmax(150px,1.5fr) repeat(5, minmax(85px,1fr))";
                const colHeaderStyle: React.CSSProperties = { fontSize: "0.62rem", fontWeight: 800, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.04em" };
                return (
                    <div style={{ ...CARD, padding: movil ? "1rem" : "1.5rem" }}>
                        <div style={{ display: "flex", flexDirection: movil ? "column" : "row", alignItems: movil ? "flex-start" : "baseline", gap: movil ? "1px" : "6px", marginBottom: movil ? "0.7rem" : "1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <TrendingUp size={16} color={C.verde} />
                                <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>Ingresos y Gastos por Cuenta</span>
                            </div>
                            <span style={{ fontSize: "0.65rem", color: C.outline, textTransform: "capitalize" }}>
                                {!movil && "· "}{periodLabel(topPeriod, periodRef)}
                            </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "8px" : "6px" }}>
                            {!movil && (
                                <div style={{ display: "grid", gridTemplateColumns: desktopCols, gap: "12px", padding: "0 12px" }}>
                                    <span />
                                    <span style={colHeaderStyle}>Ingreso</span>
                                    <span style={colHeaderStyle}>Gasto Total</span>
                                    <span style={colHeaderStyle}>Gasto Real</span>
                                    <span style={colHeaderStyle}>Transf.</span>
                                    <span style={colHeaderStyle}>Ganancia</span>
                                </div>
                            )}
                            {(() => {
                                const ingresoTotal = accountsBudget.reduce((s, b) => s + b.ingresoReal, 0);
                                const gastoRealTotal = accountsBudget.reduce((s, b) => s + b.gastoPuro, 0);
                                const gananciaTotal = ingresoTotal - gastoRealTotal;
                                const colorGananciaTotal = gananciaTotal >= 0 ? C.verde : C.rojo;
                                const delta = previousPeriodGanancia === null ? null : gananciaTotal - previousPeriodGanancia;
                                if (movil) return (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "0 10px 10px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "6px" }}>
                                            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.04em" }}>Total</span>
                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                                                <MoneyMini label="Ingreso" val={ingresoTotal} color={C.verde} prefix="+S/ " />
                                                <MoneyMini label="Gasto Real" val={gastoRealTotal} color={C.rojo} prefix="−S/ " title="Gasto real: no incluye lo que salió como transferencia a otra cuenta" />
                                                <MoneyMini label="Ganancia" val={Math.abs(gananciaTotal)} color={colorGananciaTotal} prefix={gananciaTotal >= 0 ? "+S/ " : "−S/ "} title="Ingreso Real menos Gasto Real" />
                                            </div>
                                        </div>
                                        {delta !== null && (
                                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: delta >= 0 ? C.verde : C.rojo }}>
                                                {delta >= 0 ? "▲" : "▼"} {delta >= 0 ? "+" : "−"}S/ {Math.abs(delta).toLocaleString("en-US", { minimumFractionDigits: 2 })} en ganancia vs. período anterior
                                            </span>
                                        )}
                                    </div>
                                );
                                return (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <div style={{ display: "grid", gridTemplateColumns: desktopCols, gap: "12px", alignItems: "center", padding: "10px 12px", borderRadius: "10px", background: C.surfaceContainerLow }}>
                                            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.03em" }}>Total</span>
                                            <span style={{ fontSize: "0.88rem", fontWeight: 900, color: C.verde }}>+S/ {ingresoTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                            <span />
                                            <span style={{ fontSize: "0.88rem", fontWeight: 900, color: C.rojo }} title="Gasto real: no incluye lo que salió como transferencia a otra cuenta">−S/ {gastoRealTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                            <span />
                                            <span style={{ fontSize: "0.88rem", fontWeight: 900, color: colorGananciaTotal }} title="Ingreso Real menos Gasto Real">{gananciaTotal >= 0 ? "+" : "−"}S/ {Math.abs(gananciaTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        {delta !== null && (
                                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: delta >= 0 ? C.verde : C.rojo, padding: "0 12px" }}>
                                                {delta >= 0 ? "▲" : "▼"} {delta >= 0 ? "+" : "−"}S/ {Math.abs(delta).toLocaleString("en-US", { minimumFractionDigits: 2 })} en ganancia vs. período anterior
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                            {accountsWithBalance.map(acc => {
                                const b = accountsBudget.find(x => x.id === acc.id);
                                const ingreso = b?.ingresoReal ?? 0;
                                const gastoTotalAcc = b?.gastoTotal ?? 0;
                                const gastoReal = b?.gastoPuro ?? 0;
                                const transfer = b?.transferTotal ?? 0;
                                const ganancia = ingreso - gastoReal;
                                const colorGanancia = ganancia >= 0 ? C.verde : C.rojo;
                                const isExpanded = expandedAccountIds.has(acc.id);
                                const breakdown = accountCategoryBreakdown.get(acc.id) || [];
                                const toggle = () => setExpandedAccountIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(acc.id)) next.delete(acc.id); else next.add(acc.id);
                                    return next;
                                });
                                if (movil) return (
                                    <div key={acc.id} style={{ borderRadius: "10px", background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, overflow: "hidden" }}>
                                        <button onClick={toggle} style={{ width: "100%", display: "flex", flexDirection: "column", padding: "10px", gap: "8px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: acc.color, flexShrink: 0 }} />
                                                <span style={{ fontSize: "0.78rem", fontWeight: 700, whiteSpace: "normal", flex: 1 }} title={acc.name}>
                                                    {acc.name}
                                                </span>
                                                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} style={{ display: "flex", flexShrink: 0 }}><ArrowDownCircle size={13} color={C.outline} /></motion.div>
                                            </div>
                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
                                                <MoneyMini label="Ingreso" val={ingreso} color={C.verde} prefix="+S/ " />
                                                <MoneyMini label="Gasto Total" val={gastoTotalAcc} color={C.rojo} prefix="−S/ " title="Gasto total: incluye lo que salió como transferencia a otra cuenta" />
                                                <MoneyMini label="Gasto Real" val={gastoReal} color={C.rojo} prefix="−S/ " title="Gasto real: no incluye lo que salió como transferencia a otra cuenta" />
                                                <MoneyMini label="Transf." val={transfer} color={C.outline} prefix="↔ S/ " title="Plata movida entre cuentas — no es ingreso ni gasto real" />
                                                <MoneyMini label="Ganancia" val={Math.abs(ganancia)} color={colorGanancia} prefix={ganancia >= 0 ? "+S/ " : "−S/ "} title="Ingreso Real menos Gasto Real" />
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
                                                    <div style={{ padding: "0 10px 10px", borderTop: `1px solid ${C.outlineVariant}` }}>
                                                        <CategoryBreakdown items={breakdown} />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                                return (
                                    <div key={acc.id} style={{ borderRadius: "10px", background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, overflow: "hidden" }}>
                                        <button onClick={toggle} style={{ width: "100%", display: "grid", gridTemplateColumns: desktopCols, gap: "12px", alignItems: "center", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} style={{ display: "flex", flexShrink: 0 }}><ArrowDownCircle size={13} color={C.outline} /></motion.div>
                                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: acc.color, flexShrink: 0 }} />
                                                <span style={{ fontSize: "0.82rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={acc.name}>
                                                    {acc.name}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: "0.88rem", fontWeight: 900, color: C.verde }}>+S/ {ingreso.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                            <span style={{ fontSize: "0.88rem", fontWeight: 900, color: C.rojo }} title="Gasto total: incluye lo que salió como transferencia a otra cuenta">−S/ {gastoTotalAcc.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: C.rojo }} title="Gasto real: no incluye lo que salió como transferencia a otra cuenta">−S/ {gastoReal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: C.outline }} title="Plata movida entre cuentas — no es ingreso ni gasto real">↔ S/ {transfer.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                            <span style={{ fontSize: "0.88rem", fontWeight: 900, color: colorGanancia }} title="Ingreso Real menos Gasto Real">{ganancia >= 0 ? "+" : "−"}S/ {Math.abs(ganancia).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                        </button>
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
                                                    <div style={{ padding: "0 12px 10px 33px", borderTop: `1px solid ${C.outlineVariant}` }}>
                                                        <CategoryBreakdown items={breakdown} />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* ── Categories accordion ─── */}
            <div style={{ ...CARD, padding: 0, overflow: categoriesOverflowVisible ? "visible" : "hidden" }}>
                <button onClick={() => setIsCategoriesVisible(v => !v)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: C.surface, border: "none", padding: "15px 20px", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Tag size={17} color={C.secondary} />
                        <span style={{ fontSize: "0.9rem", fontWeight: 800 }}>Categorías</span>
                    </div>
                    <motion.div animate={{ rotate: isCategoriesVisible ? 180 : 0 }}><ArrowDownCircle size={15} /></motion.div>
                </button>
                <AnimatePresence>
                    {isCategoriesVisible && (
                        <motion.div
                            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                            onAnimationStart={() => setCategoriesOverflowVisible(false)}
                            onAnimationComplete={() => setCategoriesOverflowVisible(isCategoriesVisible)}
                            style={{ overflow: categoriesOverflowVisible ? "visible" : "hidden" }}
                        >
                            <div style={{ padding: "16px 20px" }}>
                                <div style={{ marginBottom: "14px" }}>
                                    <PillToggle
                                        options={["gasto", "ingreso"]}
                                        labels={["Gasto", "Ingreso"]}
                                        value={categoryTab}
                                        onChange={(v) => setCategoryTab(v as "gasto" | "ingreso")}
                                    />
                                </div>

                                {accounts.length > 1 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                                        {([{ id: "all" as number | "all", name: "Todas", color: null as string | null }, ...accounts]).map(a => {
                                            const active = catAccountView === a.id;
                                            return (
                                                <button
                                                    key={String(a.id)}
                                                    onClick={() => setCatAccountView(a.id)}
                                                    style={{
                                                        display: "flex", alignItems: "center", gap: "5px",
                                                        padding: "4px 11px", borderRadius: "999px",
                                                        border: `1px solid ${active ? C.secondary : C.outlineVariant}`,
                                                        background: active ? C.secondary : "transparent",
                                                        color: active ? "#fff" : C.onSurfaceVariant,
                                                        fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                                                    }}
                                                >
                                                    {a.color && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: active ? "#fff" : a.color, flexShrink: 0 }} />}
                                                    {a.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {typeof catAccountView === "number" && aplicarPlantilla && (() => {
                                    const acc = accounts.find(a => a.id === catAccountView);
                                    return (
                                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", marginBottom: "14px", fontSize: "0.72rem", color: C.onSurfaceVariant }}>
                                            <span style={{ fontWeight: 700 }}>Plantilla:</span>
                                            <span>{acc?.plantilla ? PLANTILLAS[acc.plantilla].label : "ninguna"}</span>
                                            {PLANTILLA_IDS.map(id => (
                                                <button
                                                    key={id}
                                                    onClick={() => { if (window.confirm(`Agrega los grupos y categorías de la plantilla "${PLANTILLAS[id].label}" a ${acc?.name}. No borra nada. ¿Continuar?`)) aplicarPlantilla(catAccountView, id); }}
                                                    style={{ padding: "3px 9px", borderRadius: "999px", border: `1px solid ${C.outlineVariant}`, background: "transparent", color: C.secondary, fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                                                >
                                                    + {PLANTILLAS[id].label}
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })()}
                                <div style={{ marginBottom: "14px" }}>
                                    {!isAddingGroup ? (
                                        <button
                                            onClick={() => setIsAddingGroup(true)}
                                            style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "none", border: `1px dashed ${C.outlineVariant}`, borderRadius: "999px", padding: "5px 12px", fontSize: "0.74rem", fontWeight: 700, color: C.secondary, cursor: "pointer", fontFamily: "inherit" }}
                                        >
                                            <Plus size={12} /> Crear grupo
                                        </button>
                                    ) : (
                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                                            <select
                                                value={groupCategoryTarget}
                                                onChange={e => setGroupCategoryTarget(e.target.value)}
                                                style={{ padding: "6px 8px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.78rem", outline: "none", background: C.surfaceLowest, color: C.onSurface, fontFamily: "inherit" }}
                                            >
                                                <option value="">Categoría...</option>
                                                {currentCategoriesForTab.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <input
                                                autoFocus
                                                placeholder="Nombre del grupo..."
                                                value={groupDraft}
                                                onChange={e => setGroupDraft(e.target.value)}
                                                onKeyDown={e => e.key === "Enter" && handleCreateStandaloneGroup()}
                                                style={{ flex: "1 1 140px", minWidth: 0, padding: "6px 10px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.78rem", outline: "none" }}
                                            />
                                            <button onClick={handleCreateStandaloneGroup} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "8px", padding: "6px 10px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center" }}>
                                                <Plus size={14} />
                                            </button>
                                            <button onClick={() => { setIsAddingGroup(false); setGroupDraft(""); setGroupCategoryTarget(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, padding: "4px", display: "flex" }}>
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px" }}>
                                    {(() => {
                                        const currentCategories = currentCategoriesForTab;
                                        const groupMap = categoryGroups?.[categoryTab] || {};
                                        const existingGroupNames = Array.from(new Set(Object.values(groupMap))).sort((a, b) => a.localeCompare(b));
                                        const menuItemStyle: React.CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, color: C.onSurface, textAlign: "left", fontFamily: "inherit" };

                                        const renderChip = (cat: string) => {
                                            const isRenaming = renamingCategory === cat;
                                            const isMenuOpen = activeMenuCategory === cat;
                                            const otherCategories = currentCategories.filter(c => c !== cat);
                                            const currentGroup = groupMap[cat];
                                            const catDesc = (categoryDescriptions?.[categoryTab]?.[cat]) || "";
                                            const asCard = !!catDesc && !isRenaming;
                                            return (
                                                <div key={cat} style={{
                                                    display: "flex", flexDirection: asCard ? "column" : "row",
                                                    alignItems: asCard ? "stretch" : "center", gap: asCard ? "3px" : "4px",
                                                    background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`,
                                                    borderRadius: asCard ? "12px" : "999px",
                                                    padding: isRenaming ? "4px 8px" : asCard ? "7px 6px 8px 12px" : "6px 4px 6px 12px",
                                                    maxWidth: asCard ? "240px" : undefined,
                                                }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "4px", width: asCard ? "100%" : undefined }}>
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
                                                    {!isRenaming && (renameCategory || removeCategory || mergeCategory || setCategoryGroup || setCategoryDescription) && (
                                                        <div style={{ position: "relative", marginLeft: asCard ? "auto" : undefined }}>
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
                                                                                {setCategoryGroup && (
                                                                                    <button onClick={() => setCategoryMenuMode("group")} style={menuItemStyle}>
                                                                                        <Layers size={13} /> Grupo...
                                                                                    </button>
                                                                                )}
                                                                                {setCategoryDescription && (
                                                                                    <button onClick={() => { setDescDraft(catDesc); setCategoryMenuMode("desc"); }} style={menuItemStyle}>
                                                                                        <Tag size={13} /> Descripción...
                                                                                    </button>
                                                                                )}
                                                                                {setCategoryAccounts && accounts.length > 1 && (
                                                                                    <button onClick={() => setCategoryMenuMode("accounts")} style={menuItemStyle}>
                                                                                        <Wallet size={13} /> Cuentas...
                                                                                    </button>
                                                                                )}
                                                                                {removeCategory && (
                                                                                    <button onClick={() => { setConfirmDeleteCategory(cat); closeCategoryMenu(); }} style={{ ...menuItemStyle, color: C.rojo, borderTop: `1px solid ${C.outlineVariant}` }}>
                                                                                        <Trash2 size={13} /> Eliminar
                                                                                    </button>
                                                                                )}
                                                                            </>
                                                                        ) : categoryMenuMode === "merge" ? (
                                                                            <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                                                                                {otherCategories.map(other => (
                                                                                    <button key={other} onClick={() => handleMergeCategory(cat, other)} style={menuItemStyle}>
                                                                                        {other}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        ) : categoryMenuMode === "group" ? (
                                                                            <div style={{ maxHeight: "220px", overflowY: "auto", padding: "6px 4px" }}>
                                                                                <div style={{ fontSize: "0.62rem", fontWeight: 800, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 10px 6px" }}>
                                                                                    Grupo
                                                                                </div>
                                                                                {currentGroup && (
                                                                                    <button onClick={() => handleRemoveFromGroup(cat)} style={{ ...menuItemStyle, color: C.rojo }}>
                                                                                        <X size={13} /> Quitar de "{currentGroup}"
                                                                                    </button>
                                                                                )}
                                                                                {existingGroupNames.filter(g => g !== currentGroup).map(g => (
                                                                                    <button key={g} onClick={() => handleAssignGroup(cat, g)} style={menuItemStyle}>
                                                                                        <Layers size={13} /> {g}
                                                                                    </button>
                                                                                ))}
                                                                                <div style={{ display: "flex", gap: "4px", padding: "6px 10px 2px" }}>
                                                                                    <input
                                                                                        autoFocus
                                                                                        placeholder="Nuevo grupo..."
                                                                                        value={groupDraft}
                                                                                        onChange={e => setGroupDraft(e.target.value)}
                                                                                        onKeyDown={e => e.key === "Enter" && handleCreateGroupForCategory(cat)}
                                                                                        style={{ flex: 1, minWidth: 0, padding: "5px 8px", borderRadius: "6px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.74rem", outline: "none" }}
                                                                                    />
                                                                                    <button onClick={() => handleCreateGroupForCategory(cat)} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "6px", padding: "0 10px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center" }}>
                                                                                        <Plus size={13} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : categoryMenuMode === "desc" ? (
                                                                            <div style={{ padding: "8px 10px", minWidth: "210px" }}>
                                                                                <div style={{ fontSize: "0.62rem", fontWeight: 800, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "5px" }}>
                                                                                    Para qué sirve
                                                                                </div>
                                                                                <textarea
                                                                                    autoFocus
                                                                                    rows={3}
                                                                                    value={descDraft}
                                                                                    onChange={e => setDescDraft(e.target.value)}
                                                                                    onKeyDown={e => {
                                                                                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setCategoryDescription?.(categoryTab, cat, descDraft); closeCategoryMenu(); }
                                                                                        if (e.key === "Escape") closeCategoryMenu();
                                                                                    }}
                                                                                    placeholder="Ej: mercado, almuerzos, lo del día a día."
                                                                                    style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", borderRadius: "8px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.76rem", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.35 }}
                                                                                />
                                                                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "6px" }}>
                                                                                    <button onClick={closeCategoryMenu} style={{ background: "none", border: `1px solid ${C.outlineVariant}`, color: C.onSurfaceVariant, borderRadius: "6px", padding: "4px 10px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
                                                                                    <button onClick={() => { setCategoryDescription?.(categoryTab, cat, descDraft); closeCategoryMenu(); }} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "6px", padding: "4px 12px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}>Guardar</button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ maxHeight: "220px", overflowY: "auto", padding: "6px 4px" }}>
                                                                                <div style={{ fontSize: "0.62rem", fontWeight: 800, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 10px 6px" }}>
                                                                                    Aplica en
                                                                                </div>
                                                                                {accounts.map(acc => {
                                                                                    const scoped = categoryAccountScope?.[categoryTab]?.[cat] || [];
                                                                                    const checked = scoped.includes(acc.id);
                                                                                    return (
                                                                                        <label key={acc.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", fontSize: "0.78rem", fontWeight: 600, color: C.onSurface, cursor: "pointer" }}>
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={checked}
                                                                                                onChange={() => {
                                                                                                    const next = checked ? scoped.filter(id => id !== acc.id) : [...scoped, acc.id];
                                                                                                    setCategoryAccounts?.(categoryTab, cat, next);
                                                                                                }}
                                                                                            />
                                                                                            {acc.name}
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                                <div style={{ fontSize: "0.62rem", color: C.outline, fontStyle: "italic", padding: "6px 10px 2px" }}>
                                                                                    Ninguna marcada = aplica en todas.
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    )}
                                                    </div>
                                                    {asCard && (
                                                        <span style={{ fontSize: "0.64rem", lineHeight: 1.35, color: C.outline, paddingLeft: "1px" }}>{catDesc}</span>
                                                    )}
                                                </div>
                                            );
                                        };

                                        const groupOrder: string[] = [];
                                        const byGroup: Record<string, string[]> = {};
                                        const ungrouped: string[] = [];
                                        currentCategories.forEach(cat => {
                                            const g = groupMap[cat];
                                            if (g) {
                                                if (!byGroup[g]) { byGroup[g] = []; groupOrder.push(g); }
                                                byGroup[g].push(cat);
                                            } else {
                                                ungrouped.push(cat);
                                            }
                                        });

                                        // Cada grupo / categoría suelta pertenece a UNA cuenta (si está marcado
                                        // a una sola) o a "shared" (sin marca, o marcado a varias).
                                        const bucketOfGroup = (g: string): number | "shared" => {
                                            const ids = groupAccountScope?.[categoryTab]?.[g] || [];
                                            return ids.length === 1 ? ids[0] : "shared";
                                        };
                                        const bucketOfCat = (c: string): number | "shared" => {
                                            const ids = categoryAccountScope?.[categoryTab]?.[c] || [];
                                            return ids.length === 1 ? ids[0] : "shared";
                                        };
                                        const secciones: { key: number | "shared"; label: string; color: string | null }[] = [
                                            ...accounts.map(a => ({ key: a.id as number | "shared", label: a.name, color: a.color as string | null })),
                                            { key: "shared", label: "Compartidas", color: null },
                                        ];
                                        const seccionesVisibles = catAccountView === "all"
                                            ? secciones
                                            : secciones.filter(s => s.key === catAccountView || s.key === "shared");

                                        const renderGroup = (g: string) => {
                                                    const scopedAccountIds = groupAccountScope?.[categoryTab]?.[g] || [];
                                                    const scopedAccounts = scopedAccountIds.map(id => accounts.find(a => a.id === id)).filter((a): a is typeof accounts[number] => !!a);
                                                    return (
                                                    <div key={g}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                                                            {editingGroupName === g ? (
                                                                <input
                                                                    autoFocus
                                                                    value={groupRenameDraft}
                                                                    onChange={e => setGroupRenameDraft(e.target.value)}
                                                                    onKeyDown={e => { if (e.key === "Enter") saveRenameGroup(); if (e.key === "Escape") setEditingGroupName(null); }}
                                                                    onBlur={saveRenameGroup}
                                                                    style={{ fontSize: "0.68rem", fontWeight: 800, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.04em", border: "none", borderBottom: `2px solid ${C.secondary}`, outline: "none", background: "transparent", padding: "1px 0" }}
                                                                />
                                                            ) : (
                                                                <span style={{ fontSize: "0.68rem", fontWeight: 800, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                                                    <Layers size={11} style={{ verticalAlign: "-1px", marginRight: "4px" }} />{g}
                                                                </span>
                                                            )}
                                                            {scopedAccounts.length > 0 && (
                                                                <div title={`Solo en: ${scopedAccounts.map(a => a.name).join(", ")}`} style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                                                                    {scopedAccounts.map(a => (
                                                                        <span key={a.id} style={{ width: "7px", height: "7px", borderRadius: "50%", background: a.color, display: "inline-block" }} />
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {editingGroupName !== g && (renameCategoryGroup || deleteCategoryGroup || setGroupAccounts) && (
                                                                <div style={{ position: "relative" }}>
                                                                    <button
                                                                        onClick={() => { setActiveGroupMenu(activeGroupMenu === g ? null : g); setGroupMenuMode("root"); }}
                                                                        style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, display: "flex", padding: "2px" }}
                                                                    >
                                                                        <MoreVertical size={12} />
                                                                    </button>
                                                                    <AnimatePresence>
                                                                        {activeGroupMenu === g && (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                                                                style={{ position: "absolute", top: "22px", left: 0, background: "white", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", border: `1px solid ${C.outlineVariant}`, overflow: "hidden", zIndex: 20, minWidth: "150px" }}
                                                                            >
                                                                                {groupMenuMode === "root" ? (
                                                                                    <>
                                                                                        {renameCategoryGroup && (
                                                                                            <button onClick={() => { startRenameGroup(g); setActiveGroupMenu(null); }} style={menuItemStyle}>
                                                                                                <Edit2 size={13} /> Renombrar
                                                                                            </button>
                                                                                        )}
                                                                                        {setGroupAccounts && accounts.length > 1 && (
                                                                                            <button onClick={() => setGroupMenuMode("accounts")} style={menuItemStyle}>
                                                                                                <Wallet size={13} /> Cuentas...
                                                                                            </button>
                                                                                        )}
                                                                                        {deleteCategoryGroup && (
                                                                                            <button onClick={() => { setConfirmDeleteGroup(g); setActiveGroupMenu(null); }} style={{ ...menuItemStyle, color: C.rojo, borderTop: `1px solid ${C.outlineVariant}` }}>
                                                                                                <Trash2 size={13} /> Eliminar
                                                                                            </button>
                                                                                        )}
                                                                                    </>
                                                                                ) : (
                                                                                    <div style={{ maxHeight: "220px", overflowY: "auto", padding: "6px 4px" }}>
                                                                                        <div style={{ fontSize: "0.62rem", fontWeight: 800, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.04em", padding: "2px 10px 6px" }}>
                                                                                            Aplica en
                                                                                        </div>
                                                                                        {accounts.map(acc => {
                                                                                            const checked = scopedAccountIds.includes(acc.id);
                                                                                            return (
                                                                                                <label key={acc.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", fontSize: "0.78rem", fontWeight: 600, color: C.onSurface, cursor: "pointer" }}>
                                                                                                    <input
                                                                                                        type="checkbox"
                                                                                                        checked={checked}
                                                                                                        onChange={() => {
                                                                                                            const next = checked ? scopedAccountIds.filter(id => id !== acc.id) : [...scopedAccountIds, acc.id];
                                                                                                            setGroupAccounts?.(categoryTab, g, next);
                                                                                                        }}
                                                                                                    />
                                                                                                    {acc.name}
                                                                                                </label>
                                                                                            );
                                                                                        })}
                                                                                        <div style={{ fontSize: "0.62rem", color: C.outline, fontStyle: "italic", padding: "6px 10px 2px" }}>
                                                                                            Ninguna marcada = aplica en todas.
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                                                            {byGroup[g].map(renderChip)}
                                                            {addCategory && (
                                                                addingCategoryToGroup === g ? (
                                                                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                                                        <input
                                                                            autoFocus
                                                                            placeholder="Nueva categoría..."
                                                                            value={newCategoryForGroupDraft}
                                                                            onChange={e => setNewCategoryForGroupDraft(e.target.value)}
                                                                            onKeyDown={e => { if (e.key === "Enter") handleAddCategoryToGroup(g); if (e.key === "Escape") { setAddingCategoryToGroup(null); setNewCategoryForGroupDraft(""); } }}
                                                                            style={{ padding: "6px 10px", borderRadius: "999px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.78rem", outline: "none", width: "140px" }}
                                                                        />
                                                                        <button onClick={() => handleAddCategoryToGroup(g)} style={{ background: C.secondary, color: "white", border: "none", borderRadius: "50%", width: "26px", height: "26px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                                            <Plus size={13} />
                                                                        </button>
                                                                        <button onClick={() => { setAddingCategoryToGroup(null); setNewCategoryForGroupDraft(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.outline, padding: "2px", display: "flex" }}>
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setAddingCategoryToGroup(g)}
                                                                        title={`Nueva categoría en ${g}`}
                                                                        style={{ width: "26px", height: "26px", borderRadius: "50%", border: `1px dashed ${C.outlineVariant}`, background: "none", color: C.secondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                                                    >
                                                                        <Plus size={13} />
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                    );
                                        };

                                        return (
                                            <>
                                                {seccionesVisibles.map((sec, si) => {
                                                    const secGroups = groupOrder.filter(g => bucketOfGroup(g) === sec.key);
                                                    const secUngrouped = ungrouped.filter(c => bucketOfCat(c) === sec.key);
                                                    if (!secGroups.length && !secUngrouped.length) return null;
                                                    const showHeader = catAccountView === "all" || sec.key === "shared";
                                                    return (
                                                        <div key={String(sec.key)} style={{ display: "flex", flexDirection: "column", gap: "12px", ...(si > 0 ? { borderTop: `1px solid ${C.outlineVariant}`, paddingTop: "12px" } : {}) }}>
                                                            {showHeader && (
                                                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                                    {sec.color && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: sec.color, flexShrink: 0 }} />}
                                                                    <span style={{ fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.05em", textTransform: "uppercase", color: C.onSurface }}>{sec.label}</span>
                                                                </div>
                                                            )}
                                                            {secGroups.map(renderGroup)}
                                                            {secUngrouped.length > 0 && (
                                                                <div>
                                                                    {secGroups.length > 0 && (
                                                                        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: C.outline, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
                                                                            Sin grupo
                                                                        </div>
                                                                    )}
                                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                                                        {secUngrouped.map(renderChip)}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {currentCategories.length === 0 && (
                                                    <p style={{ fontSize: "0.78rem", color: C.outline, fontStyle: "italic", margin: 0 }}>
                                                        Sin categorías de {categoryTab}.
                                                    </p>
                                                )}
                                            </>
                                        );
                                    })()}
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
                                <ConfirmDialog
                                    open={!!confirmDeleteGroup}
                                    title="Eliminar grupo"
                                    message={`¿Eliminar el grupo "${confirmDeleteGroup}"? Las categorías no se eliminan, solo dejan de estar agrupadas.`}
                                    confirmLabel="Eliminar"
                                    cancelLabel="Cancelar"
                                    onConfirm={handleConfirmDeleteGroup}
                                    onCancel={() => setConfirmDeleteGroup(null)}
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

            {bloqueReal}

            {/* ── Row 4: Deudas ─── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>

                {/* Debts card */}
                <div style={{ ...bento, padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.6rem", minWidth: 0 }}>
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
                    {onNavigate && (
                        <button onClick={() => onNavigate('Deudas')} style={{ background: "none", border: "none", padding: "2px 0", cursor: "pointer", color: C.secondary, fontSize: "0.72rem", fontWeight: 700, textAlign: "left" }}>
                            Ver más →
                        </button>
                    )}
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


            {/* ── Modals ─── */}
            <AnimatePresence>
                {selectedProject && <ProjectDetailView project={selectedProject} onClose={() => setSelectedProject(null)} accounts={accounts} setAccounts={setAccounts} transactions={transactions} addProjectTask={addProjectTask} toggleProjectTask={toggleProjectTask} removeProjectTask={removeProjectTask} updateProjectTask={updateProjectTask} reorderProjectTasks={reorderProjectTasks} promoteTaskToRoutine={promoteTaskToRoutine} rutinas={rutinas} addProjectCategory={addProjectCategory} removeProjectCategory={removeProjectCategory} addInventoryItem={addInventoryItem} updateInventoryItemQuantity={updateInventoryItemQuantity} removeInventoryItem={removeInventoryItem} projects={projects} updateProject={updateProject} />}
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
                        plantillaActual={accounts.find(a => a.id === selectedAccountId)?.plantilla}
                        onAplicarPlantilla={aplicarPlantilla ? (id) => aplicarPlantilla(selectedAccountId, id) : undefined}
                    />
                )}
            </AnimatePresence>
            </>
            )}
        </div>
    );
};

// ─── Shared micro-components ──────────────────────────────────────────────────
export const PillToggle = ({ options, labels, value, onChange }: { options: string[]; labels?: string[]; value: string; onChange: (v: string) => void }) => (
    <div style={{ display: "flex", background: C.surfaceContainerLow, padding: "2px", borderRadius: "10px", gap: "2px" }}>
        {options.map((o, i) => (
            <button key={o} onClick={() => onChange(o)} style={{ padding: "3px 8px", borderRadius: "8px", border: "none", background: value === o ? "white" : "transparent", color: value === o ? C.secondary : C.onSurfaceVariant, fontSize: "0.62rem", fontWeight: 800, cursor: "pointer", boxShadow: value === o ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                {labels ? labels[i] : o.toUpperCase()}
            </button>
        ))}
    </div>
);

const feInputStyle: React.CSSProperties = { padding: "7px 9px", borderRadius: "9px", border: `1px solid ${C.outlineVariant}`, fontSize: "0.8rem", outline: "none", background: "white", boxSizing: "border-box", width: "100%" };
const feLabelStyle: React.CSSProperties = { fontSize: "0.62rem", fontWeight: 800, color: C.outline, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "3px", display: "block" };

