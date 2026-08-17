import { useMemo, useState } from "react";
import { Camera, PackageCheck, RefreshCw, Plus, Trash2, ChevronDown, Loader2, ExternalLink, X, History, CalendarClock, AlertTriangle, HardDrive } from "lucide-react";
import type { CalendarEvent, UserPreferences, NotionEstado } from "../../hooks/useAlDiaState";
import { NOTION_ESTADOS } from "../../hooks/useAlDiaState";
import { C, bento, useIsMobile, paddingPagina, cabecera, tituloPagina, subtituloPagina, money, campo, etiqueta, RADIO, TOQUE_MINIMO } from "../../theme";

/* ══════════════════════════════════════════════════════════════════
   AgendaDashboard — vista rápida de "qué sigue": próxima sesión de
   fotos, próxima entrega y cuántas entregas quedan pendientes (para
   calcular USBs/recursos). Lista completa debajo, con alta manual y
   un botón para traer lo nuevo de Notion sin salir de la pestaña.
══════════════════════════════════════════════════════════════════ */

const ESTADO_COLOR: Record<NotionEstado, string> = {
    'Agendado': '#6366F1',
    'Realizado': '#8B5CF6',
    'En Edición': '#E6A817',
    'Terminado': '#10B981',
    'Entregado': '#059669',
};

// Un solo tamaño de botón para toda la pestaña — antes "Agregar" usaba el
// botón grande del tema mientras "Activar"/"Sincronizar" tenían su propio
// padding chico, y en la misma fila se veían desparejos.
const botonCompacto = (movil: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    border: 'none', borderRadius: RADIO.chip, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
    padding: movil ? '10px 16px' : '7px 14px',
    fontSize: movil ? '0.85rem' : '0.78rem',
    minHeight: movil ? `${TOQUE_MINIMO}px` : undefined,
});

const botonCompactoPrimario = (movil: boolean): React.CSSProperties => ({
    ...botonCompacto(movil),
    background: C.primary,
    color: '#fff',
    boxShadow: '0 3px 10px rgba(148,74,24,0.22)',
});

const botonCompactoSecundario = (movil: boolean): React.CSSProperties => ({
    ...botonCompacto(movil),
    background: 'none',
    border: `1px solid ${C.outlineVariant}`,
    color: C.onSurfaceVariant,
});

interface AgendaProps {
    calendarEvents: CalendarEvent[];
    addCalendarEvent: (title: string, date: string, startTime: string, endTime: string, description: string, projectId?: number) => void;
    removeCalendarEvent: (id: number) => void;
    updateCalendarEvent: (id: number, updates: Partial<CalendarEvent>) => void;
    preferences: UserPreferences;
    updatePreference: (key: keyof UserPreferences, value: any) => void;
}

const hoyISO = () => new Date().toLocaleDateString('en-CA');

const formatFecha = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    const txt = new Date(y, m - 1, d).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
};

const diasRestantes = (iso: string) => {
    const [hy, hm, hd] = hoyISO().split('-').map(Number);
    const hoy = new Date(hy, hm - 1, hd);
    const [y, m, d] = iso.split('-').map(Number);
    const fecha = new Date(y, m - 1, d);
    return Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
};

export const AgendaDashboard = ({ calendarEvents, addCalendarEvent, removeCalendarEvent, updateCalendarEvent, preferences, updatePreference }: AgendaProps) => {
    const movil = useIsMobile();
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState<string | null>(null);
    const [syncError, setSyncError] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showHistorial, setShowHistorial] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [savingId, setSavingId] = useState<number | null>(null);
    const [errorId, setErrorId] = useState<number | null>(null);
    const [form, setForm] = useState({ title: '', date: hoyISO(), startTime: '09:00', endTime: '10:30', description: '', proyecto: '', ubicacion: '', precio: '', cobrado: '', celular: '' });
    const [crearEnNotion, setCrearEnNotion] = useState(true);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState(false);
    const [editingDateId, setEditingDateId] = useState<number | null>(null);
    const [dateForm, setDateForm] = useState({ date: '', startTime: '', endTime: '' });
    const [savingDateId, setSavingDateId] = useState<number | null>(null);
    const [dateErrorId, setDateErrorId] = useState<number | null>(null);

    // El campo notionSyncEnabled falta en documentos viejos de Firestore (se
    // agregó después) — el resto del pipeline (webhook, script de sync) ya lo
    // trata así, con `=== false` en vez de un check de verdad, para no tratar
    // "nunca se tocó" como "lo desactivé a propósito".
    const notionActive = preferences.notionSyncEnabled !== false;

    const items = useMemo(
        () => [...(calendarEvents || [])].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
        }),
        [calendarEvents]
    );

    const hoy = hoyISO();
    // Una sesión "ya sucedió" cuando su Estado avanzó más allá de Agendado.
    // Si la fecha ya pasó pero sigue en Agendado, la sesión NO se hizo (se
    // reagendó o se canceló y nadie actualizó Notion) — sigue siendo algo
    // pendiente de resolver, así que se queda en Próximas en vez de
    // esconderse en el Historial solo porque la fecha vieja ya pasó.
    const yaSucedio = (e: CalendarEvent) => e.notionId ? !!e.notionEstado && e.notionEstado !== 'Agendado' : e.date < hoy;

    const proximos = useMemo(
        () => items.filter(e => e.date >= hoy || !yaSucedio(e)),
        [items, hoy]
    );
    const pasados = useMemo(
        () => [...items].filter(e => e.date < hoy && yaSucedio(e)).reverse(),
        [items, hoy]
    );
    const proximaSesion = proximos.find(e => e.date >= hoy) || proximos[0];

    const setEstado = async (item: CalendarEvent, estado: NotionEstado) => {
        if (estado === item.notionEstado) return;
        setSavingId(item.id);
        setErrorId(null);
        try {
            const res = await fetch('/api/update-notion-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notionId: item.notionId, estado })
            });
            if (!res.ok) throw new Error('respuesta no ok');
            updateCalendarEvent(item.id, { notionEstado: estado });
        } catch (err) {
            console.error('No se pudo actualizar Estado en Notion:', err);
            setErrorId(item.id);
        } finally {
            setSavingId(null);
        }
    };

    const entregasPendientes = useMemo(
        () => items
            .filter(e => e.notionEntregaFecha && e.notionEstado !== 'Entregado')
            .sort((a, b) => a.notionEntregaFecha!.localeCompare(b.notionEntregaFecha!)),
        [items]
    );
    const proximaEntrega = entregasPendientes[0];

    const entregasTotal = items.filter(e => e.notionId).length;
    const entregadosCount = items.filter(e => e.notionEstado === 'Entregado').length;
    const porEntregarCount = items.filter(e => e.notionId && e.notionEstado !== 'Entregado').length;

    const handleSync = async () => {
        setSyncing(true);
        setSyncMsg(null);
        setSyncError(false);
        try {
            const res = await fetch('/api/sync-notion-now', { method: 'POST' });
            const raw = await res.text();
            const data = raw ? JSON.parse(raw) : {};
            if (!res.ok) throw new Error(data?.error || 'error');
            setSyncMsg(`Listo: ${data.added} nueva(s), ${data.updated} actualizada(s).`);
        } catch (err) {
            console.error('No se pudo sincronizar con Notion:', err);
            setSyncError(true);
            setSyncMsg('No se pudo sincronizar. Intenta de nuevo más tarde.');
        } finally {
            setSyncing(false);
        }
    };

    const handleActivar = () => {
        updatePreference('notionSyncEnabled', true);
        handleSync();
    };

    const resetForm = () => setForm({ title: '', date: hoyISO(), startTime: '09:00', endTime: '10:30', description: '', proyecto: '', ubicacion: '', precio: '', cobrado: '', celular: '' });

    const handleAdd = async () => {
        if (!form.title.trim() || !form.date) return;

        if (!crearEnNotion) {
            addCalendarEvent(form.title.trim(), form.date, form.startTime, form.endTime, form.description.trim());
            resetForm();
            setShowAddForm(false);
            return;
        }

        setCreating(true);
        setCreateError(false);
        try {
            const res = await fetch('/api/create-notion-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title.trim(),
                    date: form.date,
                    startTime: form.startTime,
                    endTime: form.endTime,
                    proyecto: form.proyecto.trim() || undefined,
                    ubicacion: form.ubicacion.trim() || undefined,
                    precio: form.precio || undefined,
                    cobrado: form.cobrado || undefined,
                    celular: form.celular.trim() || undefined,
                })
            });
            if (!res.ok) throw new Error('respuesta no ok');
            resetForm();
            setShowAddForm(false);
            // La página recién creada en Notion ya trae Entrega/Días Restantes
            // calculados allá — mejor traerla de vuelta que fabricarla local.
            await handleSync();
        } catch (err) {
            console.error('No se pudo crear la sesión en Notion:', err);
            setCreateError(true);
        } finally {
            setCreating(false);
        }
    };

    const openReagendar = (item: CalendarEvent) => {
        setDateErrorId(null);
        setDateForm({ date: item.date, startTime: item.startTime, endTime: item.endTime });
        setEditingDateId(item.id);
    };

    const handleReagendar = async (item: CalendarEvent) => {
        if (!dateForm.date) return;
        if (item.notionId) {
            setSavingDateId(item.id);
            setDateErrorId(null);
            try {
                const res = await fetch('/api/update-notion-date', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notionId: item.notionId, ...dateForm })
                });
                if (!res.ok) throw new Error('respuesta no ok');
                updateCalendarEvent(item.id, { ...dateForm });
                setEditingDateId(null);
            } catch (err) {
                console.error('No se pudo reagendar en Notion:', err);
                setDateErrorId(item.id);
            } finally {
                setSavingDateId(null);
            }
        } else {
            updateCalendarEvent(item.id, { ...dateForm });
            setEditingDateId(null);
        }
    };

    const renderCard = (item: CalendarEvent) => {
        const isPast = item.date < hoy;
        const isExpanded = expandedId === item.id;
        const isAtrasada = isPast && !yaSucedio(item);
        const isEditingDate = editingDateId === item.id;
        return (
            <div key={item.id} style={{ ...bento, padding: '0.85rem 1rem', opacity: isPast && !isAtrasada ? 0.7 : 1, ...(isAtrasada ? { borderColor: C.rojo } : {}) }}>
                <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', cursor: 'pointer' }}
                >
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '3px', fontSize: '0.72rem', color: C.onSurfaceVariant, fontWeight: 700 }}>
                            <span>{formatFecha(item.date)} · {item.startTime}</span>
                            {isAtrasada && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: C.rojo, fontWeight: 800 }}>
                                    <AlertTriangle size={11} /> Atrasada — no se hizo, reagéndala
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); isEditingDate ? setEditingDateId(null) : openReagendar(item); }}
                            title="Reagendar"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: isAtrasada ? C.rojo : C.outline, padding: '4px', display: 'flex' }}
                        >
                            <CalendarClock size={15} />
                        </button>
                        {!item.notionId && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeCalendarEvent(item.id); }}
                                title="Eliminar"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '4px', display: 'flex' }}
                            >
                                <Trash2 size={15} />
                            </button>
                        )}
                        <ChevronDown size={16} color={C.outline} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                    </div>
                </div>

                {isEditingDate && (
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: `1px solid ${C.surfaceContainer}` }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input type="date" value={dateForm.date} onChange={e => setDateForm(f => ({ ...f, date: e.target.value }))} style={{ ...campo(movil), flex: '1 1 130px' }} />
                            <input type="time" value={dateForm.startTime} onChange={e => setDateForm(f => ({ ...f, startTime: e.target.value }))} style={{ ...campo(movil), flex: '1 1 90px' }} />
                            <input type="time" value={dateForm.endTime} onChange={e => setDateForm(f => ({ ...f, endTime: e.target.value }))} style={{ ...campo(movil), flex: '1 1 90px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => handleReagendar(item)}
                                disabled={savingDateId === item.id}
                                style={{ ...botonCompactoPrimario(movil), opacity: savingDateId === item.id ? 0.7 : 1 }}
                            >
                                {savingDateId === item.id ? <Loader2 size={14} className="agenda-spin" /> : <CalendarClock size={14} />}
                                Guardar nueva fecha
                            </button>
                            <button
                                onClick={() => setEditingDateId(null)}
                                style={botonCompactoSecundario(movil)}
                            >
                                Cancelar
                            </button>
                        </div>
                        {dateErrorId === item.id && (
                            <div style={{ fontSize: '0.7rem', color: C.rojo, fontWeight: 700 }}>No se pudo reagendar en Notion. Intenta de nuevo.</div>
                        )}
                    </div>
                )}

                {/* Estado editable — el mismo flujo de 5 pasos que la pestaña Notion, para
                    marcar "aún no he ido" -> Realizado -> ... -> Entregado sin salir de Agenda. */}
                {item.notionId && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", marginTop: "0.6rem" }}>
                        {NOTION_ESTADOS.map(estado => {
                            const active = item.notionEstado === estado;
                            return (
                                <button
                                    key={estado}
                                    onClick={(e) => { e.stopPropagation(); setEstado(item, estado); }}
                                    disabled={savingId === item.id}
                                    style={{
                                        display: "flex", alignItems: "center", gap: "5px",
                                        background: active ? ESTADO_COLOR[estado] : C.surfaceContainerLow,
                                        color: active ? "white" : C.onSurfaceVariant,
                                        border: "none", borderRadius: "999px", padding: "6px 12px",
                                        fontSize: "0.7rem", fontWeight: 700, cursor: savingId === item.id ? "wait" : "pointer",
                                        opacity: savingId === item.id && !active ? 0.5 : 1,
                                    }}
                                >
                                    {savingId === item.id && !active && <Loader2 size={11} className="agenda-spin" />}
                                    {estado}
                                </button>
                            );
                        })}
                    </div>
                )}
                {errorId === item.id && (
                    <div style={{ fontSize: "0.7rem", color: C.rojo, fontWeight: 700, marginTop: "0.4rem" }}>No se pudo guardar en Notion. Intenta de nuevo.</div>
                )}

                {isExpanded && (
                    <div style={{ marginTop: '0.7rem', paddingTop: '0.7rem', borderTop: `1px solid ${C.surfaceContainer}`, display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', color: C.onSurfaceVariant, fontWeight: 600 }}>
                        {item.description && <div>{item.description}</div>}
                        {item.notionProyecto && <div><b>Proyecto:</b> {item.notionProyecto}</div>}
                        {item.notionCelular && (
                            <div><b>Celular:</b> <a href={`tel:${item.notionCelular}`} onClick={e => e.stopPropagation()} style={{ color: C.primary, fontWeight: 700 }}>{item.notionCelular}</a></div>
                        )}
                        {item.notionPrecio !== undefined && <div><b>Precio:</b> {money(item.notionPrecio)}</div>}
                        {item.notionCobrado !== undefined && <div><b>Cobrado:</b> {money(item.notionCobrado)}</div>}
                        {item.notionSaldoPorCobrar !== undefined && item.notionSaldoPorCobrar > 0 && (
                            <div style={{ color: C.rojo }}><b>Saldo por cobrar:</b> {money(item.notionSaldoPorCobrar)}</div>
                        )}
                        {item.notionEntregaFecha && <div><b>Entrega:</b> {formatFecha(item.notionEntregaFecha)}</div>}
                        {item.notionDiasRestantes && <div><b>Días restantes:</b> {item.notionDiasRestantes}</div>}
                        <div>{item.startTime} – {item.endTime}</div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "1rem" : "1.5rem", ...paddingPagina(movil), color: "var(--text-carbon)" }}>
            <div style={cabecera(movil)}>
                <div>
                    <h2 style={tituloPagina}>Agenda</h2>
                    <p style={subtituloPagina}>Tus próximas sesiones y entregas, a un vistazo.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 800, color: C.onSurfaceVariant }}>
                        <RefreshCw size={14} color={notionActive ? C.verde : C.outline} className={syncing ? 'agenda-spin' : ''} />
                        Notion {notionActive ? 'activada' : 'desactivada'}
                    </div>
                    {!notionActive ? (
                        <button onClick={handleActivar} style={{ ...botonCompacto(movil), background: C.verde, color: '#fff' }}>
                            Activar
                        </button>
                    ) : (
                        <button onClick={handleSync} disabled={syncing} style={{ ...botonCompactoPrimario(movil), opacity: syncing ? 0.7 : 1, cursor: syncing ? 'wait' : 'pointer' }}>
                            {syncing ? <Loader2 size={13} className="agenda-spin" /> : <RefreshCw size={13} />}
                            Sincronizar ahora
                        </button>
                    )}
                    <button onClick={() => setShowAddForm(s => !s)} style={botonCompactoPrimario(movil)}>
                        {showAddForm ? <X size={15} /> : <Plus size={15} />}
                        {showAddForm ? 'Cerrar' : 'Agregar'}
                    </button>
                </div>
            </div>
            {syncMsg && (
                <div style={{ fontSize: '0.72rem', color: syncError ? C.rojo : C.outline, fontWeight: 600, marginTop: '-0.6rem' }}>{syncMsg}</div>
            )}

            {/* Alta manual */}
            {showAddForm && (
                <div style={{ ...bento, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div
                        onClick={() => setCrearEnNotion(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '0.4rem 0.6rem', background: crearEnNotion ? 'rgba(16,185,129,0.08)' : C.surfaceContainerLow, borderRadius: '10px' }}
                    >
                        <div style={{
                            width: 34, height: 20, borderRadius: '10px', flexShrink: 0, position: 'relative',
                            background: crearEnNotion ? C.verde : '#D1D5DB', transition: 'background 0.2s'
                        }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: crearEnNotion ? 16 : 2, transition: 'left 0.2s' }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.onSurfaceVariant }}>
                            {crearEnNotion ? 'Se crea también en Notion' : 'Solo en esta Agenda (no toca Notion)'}
                        </span>
                    </div>
                    <input
                        placeholder="Título (ej. Sesión de fotos — Boda Ana & Luis)"
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        style={campo(movil)}
                    />
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ ...campo(movil), flex: '1 1 140px' }} />
                        <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} style={{ ...campo(movil), flex: '1 1 100px' }} />
                        <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} style={{ ...campo(movil), flex: '1 1 100px' }} />
                    </div>
                    {crearEnNotion ? (
                        <>
                            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <input placeholder="Proyecto (ej. JuanMa Producer, Personal)" value={form.proyecto} onChange={e => setForm(f => ({ ...f, proyecto: e.target.value }))} style={{ ...campo(movil), flex: '1 1 200px' }} />
                                <input placeholder="Ubicación (opcional)" value={form.ubicacion} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))} style={{ ...campo(movil), flex: '1 1 140px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <input type="tel" placeholder="Celular del cliente (opcional)" value={form.celular} onChange={e => setForm(f => ({ ...f, celular: e.target.value }))} style={{ ...campo(movil), flex: '1 1 160px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <input type="number" placeholder="Precio (opcional)" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} style={{ ...campo(movil), flex: '1 1 140px' }} />
                                <input type="number" placeholder="Cobrado (opcional)" value={form.cobrado} onChange={e => setForm(f => ({ ...f, cobrado: e.target.value }))} style={{ ...campo(movil), flex: '1 1 140px' }} />
                            </div>
                        </>
                    ) : (
                        <input
                            placeholder="Notas (opcional)"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            style={campo(movil)}
                        />
                    )}
                    <button onClick={handleAdd} disabled={creating} style={{ ...botonCompactoPrimario(movil), alignSelf: movil ? 'stretch' : 'flex-start', opacity: creating ? 0.7 : 1 }}>
                        {creating ? <Loader2 size={16} className="agenda-spin" /> : <Plus size={16} />}
                        {crearEnNotion ? 'Crear en Notion' : 'Guardar solo en la agenda'}
                    </button>
                    {createError && (
                        <div style={{ fontSize: '0.72rem', color: C.rojo, fontWeight: 700 }}>No se pudo crear en Notion. Intenta de nuevo.</div>
                    )}
                </div>
            )}


            {/* Próxima sesión / próxima entrega / resumen de entregas — todo en una fila */}
            <div style={{ display: 'grid', gridTemplateColumns: movil ? '1fr' : entregasTotal > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '0.7rem' }}>
                <div style={{ ...bento, padding: '0.8rem', display: 'flex', gap: '9px', alignItems: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Camera size={16} color="#6366F1" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={etiqueta}>Próxima sesión</div>
                        {proximaSesion ? (
                            <>
                                <div style={{ fontWeight: 800, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proximaSesion.title}</div>
                                <div style={{ fontSize: '0.7rem', color: C.onSurfaceVariant, fontWeight: 700 }}>
                                    {formatFecha(proximaSesion.date)} · {proximaSesion.startTime}
                                    {' '}({diasRestantes(proximaSesion.date) === 0 ? 'hoy' : `en ${diasRestantes(proximaSesion.date)}d`})
                                </div>
                            </>
                        ) : <div style={{ fontSize: '0.76rem', color: C.outline, fontWeight: 600 }}>Sin sesiones programadas.</div>}
                    </div>
                </div>
                <div style={{ ...bento, padding: '0.8rem', display: 'flex', gap: '9px', alignItems: 'center' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(5,150,105,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <PackageCheck size={16} color="#059669" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={etiqueta}>Próxima entrega</div>
                        {proximaEntrega ? (
                            <>
                                <div style={{ fontWeight: 800, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proximaEntrega.title}</div>
                                <div style={{ fontSize: '0.7rem', color: C.onSurfaceVariant, fontWeight: 700 }}>
                                    {formatFecha(proximaEntrega.notionEntregaFecha!)}
                                    {proximaEntrega.notionDiasRestantes ? ` · ${proximaEntrega.notionDiasRestantes}` : ''}
                                </div>
                            </>
                        ) : <div style={{ fontSize: '0.76rem', color: C.outline, fontWeight: 600 }}>Sin entregas pendientes.</div>}
                    </div>
                </div>
                {entregasTotal > 0 && (
                    <div style={{ ...bento, padding: '0.8rem', display: 'flex', gap: '9px', alignItems: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(230,168,23,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <HardDrive size={16} color={C.ambar} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={etiqueta}>Entregas</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                                <span style={{ color: C.verde }}>{entregadosCount} entregados</span>
                                {' · '}
                                <span style={{ color: C.ambar }}>{porEntregarCount} por entregar</span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: C.outline, fontWeight: 600 }}>≈ {porEntregarCount} USBs / recursos</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Próximas — ordenadas por Fecha y hora (la sesión en sí), no por Estado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                <div style={etiqueta}>Próximas ({proximos.length})</div>
                {items.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: C.outline }}>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Sin eventos todavía. Agrega uno o activa Notion arriba.</p>
                    </div>
                )}
                {items.length > 0 && proximos.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: C.outline }}>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Sin sesiones ni entregas por venir.</p>
                    </div>
                )}
                {proximos.map(item => renderCard(item))}
            </div>

            {/* Historial — colapsado por defecto, para no tapar lo que viene */}
            {pasados.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    <button
                        onClick={() => setShowHistorial(s => !s)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, ...etiqueta }}
                    >
                        <History size={13} /> Historial ({pasados.length})
                        <ChevronDown size={14} style={{ transform: showHistorial ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                    </button>
                    {showHistorial && pasados.map(item => renderCard(item))}
                </div>
            )}

            <a href="https://notion.so" target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: C.outline, textDecoration: "none", justifyContent: "center" }}>
                <ExternalLink size={13} /> Abrir Notion
            </a>

            <style>{`
                @keyframes agenda-spin { to { transform: rotate(360deg); } }
                .agenda-spin { animation: agenda-spin 0.7s linear infinite; }
            `}</style>
        </div>
    );
};
