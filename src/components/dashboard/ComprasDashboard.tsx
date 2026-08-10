import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laptop, Home, Shirt, ShoppingBag, Plus, X, Trash2, ExternalLink, MoreVertical, TrendingUp, Zap } from 'lucide-react';
import type { ShoppingItem } from '../../hooks/useAlDiaState';
import {
    C, bento, money, useIsMobile,
    paddingPagina, cabecera, tituloPagina, subtituloPagina, campo, botonPrimario,
} from '../../theme';

/* ══════════════════════════════════════════════════════════════════
   ComprasDashboard — "Lista de Compras & Deseos"

   Vista dedicada del mismo ShoppingItem que ya usa Plan del Mes, pero
   pensada para planear compras a mediano plazo: categoría, estado del
   ahorro (planeando/ahorrando/listo) y de dónde comprarlo. Plan sigue
   siendo la vista rápida "qué falta pagar este mes"; esta es la vista
   de wishlist con presupuesto por categoría.
══════════════════════════════════════════════════════════════════ */

interface ComprasDashboardProps {
    shoppingList: ShoppingItem[];
    addShoppingItem: (
        text: string, amount: number, priority: 'necesito' | 'quiero',
        projectId?: number, note?: string, category?: string,
        status?: 'planning' | 'saving' | 'ready', storeName?: string, storeUrl?: string,
        nivel?: 1 | 2 | 3
    ) => void;
    updateShoppingItem: (id: number, updates: Partial<ShoppingItem>) => void;
    removeShoppingItem: (id: number) => void;
    markShoppingItemPurchased: (id: number, finalAmount?: number, accountId?: number) => void;
    presupuestoDisponible: number;
}

const STATUS_INFO: Record<'planning' | 'saving' | 'ready', { label: string; color: string }> = {
    planning: { label: 'Planeando', color: C.outline },
    saving:   { label: 'Ahorrando', color: C.secondary },
    ready:    { label: 'Listo para comprar', color: C.verde },
};

// La Arquitectura del Abastecimiento (Sistema de 3 Capas): cada compra planeada
// se clasifica en uno de estos niveles para saber con qué regla se financia.
// El texto completo queda visible en cada grupo de la lista para no tener que
// recordarlo de memoria cada vez que se agrega un ítem.
const NIVEL_INFO: Record<1 | 2 | 3, { label: string; corto: string; definicion: string; regla: string; color: string }> = {
    1: {
        label: 'Nivel 1 — OPEX Biológico y Logístico',
        corto: 'Ejecución inmediata',
        definicion: 'Lo que necesitan la máquina humana (tú) y la máquina comercial para no detenerse: comida esencial, gasolina, internet, discos duros para entregar un evento.',
        regla: 'No requiere metas ni ahorro. Se financia directo con el flujo de caja semanal (tu Autosueldo). Fricción: cero — se compra y punto.',
        color: C.verde,
    },
    2: {
        label: 'Nivel 2 — CAPEX / Adquisición de Activos',
        corto: 'Metas de capital',
        definicion: 'Todo lo que te va a devolver dinero o tiempo pero tiene un costo elevado: actualizar la cámara, un micrófono profesional, invertir en pauta.',
        regla: 'Se le asigna un ROI (¿en cuántos eventos se paga solo?). El capital de trabajo se acumula aparte hasta ejecutar la compra. Fricción: alta.',
        color: C.secondary,
    },
    3: {
        label: 'Nivel 3 — La Zona de Cuarentena',
        corto: 'Deseos y dopamina',
        definicion: 'Ropa por impulso, salidas costosas, el último gadget que se ve bien pero no altera tu facturación, o golosinas innecesarias.',
        regla: 'Anótalo con la fecha de hoy y espera 14 días antes de comprarlo. Si sigues queriéndolo, recién ahí evalúas si hay margen líquido sin tocar el dinero del negocio.',
        color: C.rojo,
    },
};

const categoryIcon = (category?: string) => {
    const c = (category || '').toLowerCase();
    if (c.includes('tecno') || c.includes('tech')) return Laptop;
    if (c.includes('hogar') || c.includes('casa')) return Home;
    if (c.includes('ropa') || c.includes('moda')) return Shirt;
    return ShoppingBag;
};

const emptyForm = { text: '', amount: '', category: '', priority: 'necesito' as 'necesito' | 'quiero', status: 'planning' as 'planning' | 'saving' | 'ready', storeName: '', storeUrl: '', nivel: 1 as 1 | 2 | 3 };

export const ComprasDashboard = ({ shoppingList, addShoppingItem, updateShoppingItem, removeShoppingItem, markShoppingItemPurchased, presupuestoDisponible }: ComprasDashboardProps) => {
    const movil = useIsMobile();

    const pendientes = useMemo(() => shoppingList.filter(i => !i.purchasedAt), [shoppingList]);

    // Ítems que ya podrías pagar hoy mismo con lo que tienes en tus cuentas —
    // los más baratos primero, porque esos son los que de verdad están "a tu alcance ya".
    const alAlcance = useMemo(() =>
        pendientes
            .filter(i => (Number(i.estimatedAmount) || 0) > 0 && (Number(i.estimatedAmount) || 0) <= presupuestoDisponible)
            .sort((a, b) => (Number(a.estimatedAmount) || 0) - (Number(b.estimatedAmount) || 0)),
        [pendientes, presupuestoDisponible]);
    const compradas = useMemo(() => shoppingList.filter(i => i.purchasedAt).slice(0, 5), [shoppingList]);

    const categorias = useMemo(() => {
        const set = new Set(pendientes.map(i => i.category?.trim()).filter(Boolean) as string[]);
        return Array.from(set).sort();
    }, [pendientes]);

    const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
    const [soloAltaPrioridad, setSoloAltaPrioridad] = useState(false);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [menuAbierto, setMenuAbierto] = useState<number | null>(null);

    const filtrados = useMemo(() => pendientes.filter(i =>
        (!filtroCategoria || (i.category?.trim() || 'Sin categoría') === filtroCategoria) &&
        (!soloAltaPrioridad || i.priority === 'necesito')
    ), [pendientes, filtroCategoria, soloAltaPrioridad]);

    // Agrupado por Nivel (Arquitectura de Abastecimiento) en vez de categoría: es el
    // orden que importa para decidir cómo se financia cada cosa, no el rubro.
    const gruposPorNivel = useMemo(() => {
        const map = new Map<number, ShoppingItem[]>();
        filtrados.forEach(item => {
            const key = item.nivel ?? 0;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(item);
        });
        return [1, 2, 3, 0]
            .filter(k => map.has(k))
            .map(k => [k, map.get(k)!] as [number, ShoppingItem[]]);
    }, [filtrados]);

    const presupuesto = useMemo(() => {
        const total = pendientes.reduce((s, i) => s + (Number(i.estimatedAmount) || 0), 0);
        const porEstado = { planning: 0, saving: 0, ready: 0 };
        pendientes.forEach(i => { porEstado[i.status || 'planning'] += Number(i.estimatedAmount) || 0; });
        return { total, ...porEstado };
    }, [pendientes]);

    const categoriasPct = useMemo(() => {
        const total = pendientes.reduce((s, i) => s + (Number(i.estimatedAmount) || 0), 0);
        const map = new Map<string, number>();
        pendientes.forEach(i => {
            const key = i.category?.trim() || 'Sin categoría';
            map.set(key, (map.get(key) || 0) + (Number(i.estimatedAmount) || 0));
        });
        return Array.from(map.entries())
            .map(([cat, monto]) => ({ cat, monto, pct: total > 0 ? Math.round((monto / total) * 100) : 0 }))
            .sort((a, b) => b.monto - a.monto);
    }, [pendientes]);

    const submitForm = (e: React.FormEvent) => {
        e.preventDefault();
        const monto = parseFloat(form.amount);
        if (!form.text.trim()) return;
        addShoppingItem(
            form.text.trim(), isNaN(monto) ? 0 : monto, form.priority,
            undefined, undefined,
            form.category.trim() || undefined, form.status,
            form.storeName.trim() || undefined, form.storeUrl.trim() || undefined,
            form.nivel,
        );
        setForm(emptyForm);
        setMostrarForm(false);
    };

    return (
        <div style={paddingPagina(movil)}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Lista de Compras &amp; Deseos</h2>
                    <p style={subtituloPagina}>Organiza tus compras planeadas y sigue tus metas de ahorro.</p>
                </div>
                <button onClick={() => setMostrarForm(v => !v)} style={botonPrimario(movil)}>
                    {mostrarForm ? <X size={16} /> : <Plus size={16} />}
                    {mostrarForm ? 'Cancelar' : 'Añadir ítem'}
                </button>
            </div>

            <AnimatePresence initial={false}>
                {mostrarForm && (
                    <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={submitForm}
                        style={{ ...bento, borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: movil ? '1fr' : '2fr 1fr', gap: '10px' }}>
                            <input placeholder="¿Qué querés comprar?" value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} style={campo(movil)} autoFocus />
                            <input placeholder="Monto estimado" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={campo(movil)} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: movil ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                            {([1, 2, 3] as const).map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, nivel: n }))}
                                    style={{
                                        textAlign: 'left', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                                        border: `1.5px solid ${form.nivel === n ? NIVEL_INFO[n].color : C.outlineVariant}`,
                                        background: form.nivel === n ? `${NIVEL_INFO[n].color}18` : 'transparent',
                                    }}
                                >
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: NIVEL_INFO[n].color }}>Nivel {n}</div>
                                    <div style={{ fontSize: '0.68rem', color: C.onSurfaceVariant }}>{NIVEL_INFO[n].corto}</div>
                                </button>
                            ))}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: C.onSurfaceVariant, lineHeight: 1.4, background: C.surfaceContainerLow, padding: '0.6rem 0.75rem', borderRadius: '8px' }}>
                            <strong style={{ color: C.onSurface }}>{NIVEL_INFO[form.nivel].label}:</strong> {NIVEL_INFO[form.nivel].definicion} {NIVEL_INFO[form.nivel].regla}
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: movil ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                            <input placeholder="Categoría (ej. Tecnología)" list="compras-categorias" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={campo(movil)} />
                            <datalist id="compras-categorias">
                                {categorias.map(c => <option key={c} value={c} />)}
                            </datalist>
                            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as 'necesito' | 'quiero' }))} style={campo(movil)}>
                                <option value="necesito">Alta prioridad</option>
                                <option value="quiero">Media prioridad</option>
                            </select>
                            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'planning' | 'saving' | 'ready' }))} style={campo(movil)}>
                                <option value="planning">Planeando</option>
                                <option value="saving">Ahorrando</option>
                                <option value="ready">Listo para comprar</option>
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: movil ? '1fr' : '1fr 2fr', gap: '10px' }}>
                            <input placeholder="Tienda (ej. Amazon)" value={form.storeName} onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))} style={campo(movil)} />
                            <input placeholder="Link de la tienda (opcional)" value={form.storeUrl} onChange={e => setForm(f => ({ ...f, storeUrl: e.target.value }))} style={campo(movil)} />
                        </div>
                        <button type="submit" disabled={!form.text.trim()} style={{ ...botonPrimario(movil), alignSelf: 'flex-end', opacity: form.text.trim() ? 1 : 0.5 }}>
                            Guardar ítem
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>

            <div style={{ display: 'grid', gridTemplateColumns: movil ? '1fr' : '2fr 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>
                {/* ── Columna principal: filtros + lista agrupada ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ ...bento, borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: C.onSurfaceVariant }}>Filtros:</span>
                        <Chip label="Todos" active={filtroCategoria === null} onClick={() => setFiltroCategoria(null)} />
                        {categorias.map(c => (
                            <Chip key={c} label={c} active={filtroCategoria === c} onClick={() => setFiltroCategoria(c === filtroCategoria ? null : c)} />
                        ))}
                        <div style={{ width: '1px', height: '16px', background: C.outlineVariant, margin: '0 4px' }} />
                        <Chip label="Alta prioridad" active={soloAltaPrioridad} danger onClick={() => setSoloAltaPrioridad(v => !v)} />
                    </div>

                    {gruposPorNivel.length === 0 && (
                        <div style={{ ...bento, borderRadius: '10px', padding: '3rem 1rem', textAlign: 'center', color: C.outline }}>
                            <ShoppingBag size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                            <p style={{ margin: 0, fontSize: '0.85rem' }}>Nada apuntado todavía. Agrega tu primer ítem arriba.</p>
                        </div>
                    )}

                    {gruposPorNivel.map(([nivel, items]) => (
                        <div key={nivel} style={{ ...bento, borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ padding: '0.85rem 1rem', borderBottom: `1px solid ${C.outlineVariant}`, background: C.surfaceContainerLow, borderLeft: nivel ? `4px solid ${NIVEL_INFO[nivel as 1 | 2 | 3].color}` : undefined }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: C.onSurface }}>
                                    {nivel ? NIVEL_INFO[nivel as 1 | 2 | 3].label : 'Sin nivel asignado'}
                                </span>
                                {nivel ? (
                                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: C.onSurfaceVariant, lineHeight: 1.4 }}>
                                        {NIVEL_INFO[nivel as 1 | 2 | 3].definicion} {NIVEL_INFO[nivel as 1 | 2 | 3].regla}
                                    </p>
                                ) : (
                                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: C.onSurfaceVariant, lineHeight: 1.4 }}>
                                        Ítems agregados antes de clasificarlos en un nivel — edítalos para asignarles uno.
                                    </p>
                                )}
                            </div>
                            <div>
                                {items.map(item => {
                                    const Icon = categoryIcon(item.category);
                                    const status = STATUS_INFO[item.status || 'planning'];
                                    return (
                                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.85rem 1rem', borderBottom: `1px solid ${C.surfaceContainer}` }}>
                                            <div style={{ width: '38px', height: '38px', minWidth: '38px', borderRadius: '9px', background: C.surfaceContainerLow, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.onSurfaceVariant }}>
                                                <Icon size={17} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.87rem', fontWeight: 700, color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</div>
                                                {item.category && (
                                                    <span style={{ fontSize: '0.68rem', color: C.onSurfaceVariant }}>{item.category}</span>
                                                )}
                                                {item.storeUrl ? (
                                                    <a href={item.storeUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: C.primary, display: 'inline-flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}>
                                                        {item.storeName || 'Ver tienda'} <ExternalLink size={10} />
                                                    </a>
                                                ) : item.storeName ? (
                                                    <span style={{ fontSize: '0.72rem', color: C.onSurfaceVariant }}>{item.storeName}</span>
                                                ) : null}
                                            </div>
                                            {!movil && (
                                                <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em', padding: '3px 8px', borderRadius: '6px', background: item.priority === 'necesito' ? 'rgba(239,68,68,0.12)' : C.surfaceContainerLow, color: item.priority === 'necesito' ? C.rojo : C.onSurfaceVariant, textTransform: 'uppercase' }}>
                                                    {item.priority === 'necesito' ? 'Alta' : 'Media'}
                                                </span>
                                            )}
                                            {!movil && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: C.onSurfaceVariant, minWidth: '110px' }}>
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: status.color, flexShrink: 0 }} />
                                                    {status.label}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: C.onSurface, flexShrink: 0, minWidth: '80px', textAlign: 'right' }}>{money(item.estimatedAmount)}</span>
                                            <div style={{ position: 'relative' }}>
                                                <button onClick={() => setMenuAbierto(v => v === item.id ? null : item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outlineVariant, padding: '4px', display: 'flex' }}>
                                                    <MoreVertical size={16} />
                                                </button>
                                                {menuAbierto === item.id && (
                                                    <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 5, background: 'white', border: `1px solid ${C.outlineVariant}`, borderRadius: '9px', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', overflow: 'hidden', minWidth: '170px' }}>
                                                        <button onClick={() => { markShoppingItemPurchased(item.id); setMenuAbierto(null); }} style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', background: 'none', border: 'none', padding: '9px 12px', cursor: 'pointer', color: C.onSurface, fontSize: '0.78rem', fontWeight: 600, textAlign: 'left' }}>Marcar comprado</button>
                                                        {(['planning', 'saving', 'ready'] as const).filter(s => s !== (item.status || 'planning')).map(s => (
                                                            <button key={s} onClick={() => { updateShoppingItem(item.id, { status: s }); setMenuAbierto(null); }} style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', background: 'none', border: 'none', padding: '9px 12px', cursor: 'pointer', color: C.onSurface, fontSize: '0.78rem', fontWeight: 600, textAlign: 'left', borderTop: `1px solid ${C.surfaceContainerLow}` }}>
                                                                Mover a: {STATUS_INFO[s].label}
                                                            </button>
                                                        ))}
                                                        {([1, 2, 3] as const).filter(n => n !== item.nivel).map(n => (
                                                            <button key={n} onClick={() => { updateShoppingItem(item.id, { nivel: n }); setMenuAbierto(null); }} style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', background: 'none', border: 'none', padding: '9px 12px', cursor: 'pointer', color: C.onSurface, fontSize: '0.78rem', fontWeight: 600, textAlign: 'left', borderTop: `1px solid ${C.surfaceContainerLow}` }}>
                                                                Asignar a: Nivel {n}
                                                            </button>
                                                        ))}
                                                        <button onClick={() => { removeShoppingItem(item.id); setMenuAbierto(null); }} style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', background: 'none', border: 'none', padding: '9px 12px', cursor: 'pointer', color: C.rojo, fontSize: '0.78rem', fontWeight: 600, textAlign: 'left', borderTop: `1px solid ${C.surfaceContainerLow}` }}><Trash2 size={13} /> Eliminar</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {compradas.length > 0 && (
                        <details style={{ ...bento, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                            <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: C.outline, fontWeight: 700 }}>
                                Comprado hace poco ({compradas.length})
                            </summary>
                            <div style={{ marginTop: '8px' }}>
                                {compradas.map(item => (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', opacity: 0.65, fontSize: '0.8rem', color: C.onSurfaceVariant }}>
                                        <span style={{ flex: 1, textDecoration: 'line-through' }}>{item.text}</span>
                                        <span style={{ fontWeight: 700 }}>{money(item.estimatedAmount)}</span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </div>

                {/* ── Columna lateral: filtro de oportunidad + presupuesto + categorías ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ ...bento, borderRadius: '10px', padding: '1.1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <Zap size={15} color={C.secondary} />
                            <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: C.onSurface }}>Filtro de Oportunidad</h3>
                        </div>
                        <p style={{ margin: '0 0 0.85rem', fontSize: '0.72rem', color: C.onSurfaceVariant, lineHeight: 1.4 }}>
                            Artículos que puedes permitirte ahora mismo, basado en el saldo real de tus cuentas.
                        </p>
                        <div style={{ background: C.surfaceContainerLow, borderRadius: '8px', padding: '0.7rem 0.85rem', marginBottom: '0.85rem' }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: C.onSurfaceVariant, marginBottom: '2px' }}>Presupuesto Disponible</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: presupuestoDisponible >= 0 ? C.verde : C.rojo }}>{money(presupuestoDisponible)}</div>
                        </div>
                        {alAlcance.length === 0 ? (
                            <p style={{ margin: 0, fontSize: '0.75rem', color: C.outline, fontStyle: 'italic' }}>
                                Nada en tu lista entra en tu saldo actual todavía.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {alAlcance.map(item => (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '0.5rem 0.6rem', borderRadius: '8px', border: `1px solid ${C.outlineVariant}` }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</span>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: C.onSurface, flexShrink: 0 }}>{money(item.estimatedAmount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ background: C.primary, color: 'white', borderRadius: '10px', padding: '1.25rem', boxShadow: '0 12px 24px rgba(148,74,24,0.2)' }}>
                        <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 700, opacity: 0.9 }}>Presupuesto Total Estimado</h3>
                        <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.01em', marginBottom: '0.25rem' }}>{money(presupuesto.total)}</div>
                        {presupuesto.ready > 0 && (
                            <div style={{ fontSize: '0.75rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
                                <TrendingUp size={13} /> {money(presupuesto.ready)} listo para comprar
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.9 }}>
                                <span>Listo para comprar</span><span style={{ fontWeight: 700 }}>{money(presupuesto.ready)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.9 }}>
                                <span>Ahorrando</span><span style={{ fontWeight: 700 }}>{money(presupuesto.saving)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.9 }}>
                                <span>Planeando</span><span style={{ fontWeight: 700 }}>{money(presupuesto.planning)}</span>
                            </div>
                        </div>
                    </div>

                    {categoriasPct.length > 0 && (
                        <div style={{ ...bento, borderRadius: '10px', padding: '1.1rem' }}>
                            <h3 style={{ margin: '0 0 0.85rem', fontSize: '0.85rem', fontWeight: 700, color: C.onSurface }}>Categorías</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {categoriasPct.map(({ cat, pct }) => (
                                    <div key={cat}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                                            <span style={{ color: C.onSurface, fontWeight: 600 }}>{cat}</span>
                                            <span style={{ color: C.onSurfaceVariant }}>{pct}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '6px', background: C.surfaceContainerHighest, borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: C.primary, borderRadius: '3px' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Chip = ({ label, active, danger, onClick }: { label: string; active: boolean; danger?: boolean; onClick: () => void }) => (
    <span
        onClick={onClick}
        style={{
            padding: '5px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            border: `1px solid ${active && danger ? C.rojo : active ? C.primary : C.outlineVariant}`,
            background: active && danger ? 'rgba(239,68,68,0.12)' : active ? C.primaryContainer : 'transparent',
            color: active && danger ? C.rojo : active ? C.onPrimaryContainer : C.onSurfaceVariant,
        }}
    >
        {label}
    </span>
);
