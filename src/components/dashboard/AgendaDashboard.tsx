import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Plus, Trash2, ChevronDown, Loader2, ExternalLink, X, History, CalendarClock, AlertTriangle, Wallet, ListTodo, Check, Info, Pencil } from "lucide-react";
import type { CalendarEvent, UserPreferences, NotionEstado, Note } from "../../hooks/useAlDiaState";
import { NOTION_ESTADOS } from "../../hooks/useAlDiaState";
import { C, bento, useIsMobile, paddingPagina, money, campo, etiqueta, RADIO, TOQUE_MINIMO } from "../../theme";

/* ══════════════════════════════════════════════════════════════════
   AgendaDashboard — vista rápida de "qué sigue": próxima sesión de
   fotos, próxima entrega y cuántas entregas quedan pendientes (para
   calcular USBs/recursos). Lista completa debajo, con alta manual y
   un botón para traer lo nuevo de Notion sin salir de la pestaña.
══════════════════════════════════════════════════════════════════ */

const ESTADO_COLOR: Record<NotionEstado, string> = {
    'Agendado': '#3ED9A0',
    'Realizado': '#8B5CF6',
    'En Edición': '#B9760A',
    // Azul, no verde: "Terminado" no es "ya se entregó" -- mismo criterio que
    // en EsporadicosDashboard, para no confundir "listo para entregar" con
    // "ya entregado" solo por el color.
    'Terminado': '#2563EB',
    'Entregado': '#0FA97A',
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
    boxShadow: '0 3px 10px rgba(15, 169, 122,0.22)',
});

const botonCompactoSecundario = (movil: boolean): React.CSSProperties => ({
    ...botonCompacto(movil),
    background: 'none',
    border: `1px solid ${C.outlineVariant}`,
    color: C.onSurfaceVariant,
});

// Mismo semáforo que Rendimiento (rojo/ámbar/verde por umbral) para las
// barritas de progreso de las tarjetas de resumen de acá abajo.
const colorPorProgreso = (pct: number) => pct < 40 ? C.rojo : pct < 70 ? C.ambar : C.verde;

// Barra fina de progreso, igual a la de las tarjetas de área en Rendimiento.
const BarraProgreso = ({ pct }: { pct: number }) => (
    <div style={{ height: '5px', borderRadius: '999px', background: C.surfaceContainer, overflow: 'hidden', marginTop: '5px' }}>
        <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: colorPorProgreso(pct), borderRadius: '999px' }} />
    </div>
);

interface AgendaProps {
    calendarEvents: CalendarEvent[];
    addCalendarEvent: (title: string, date: string, startTime: string, endTime: string, description: string, projectId?: number) => void;
    removeCalendarEvent: (id: number) => void;
    updateCalendarEvent: (id: number, updates: Partial<CalendarEvent>) => void;
    preferences: UserPreferences;
    updatePreference: (key: keyof UserPreferences, value: any) => void;
    notes: Note[];
    addNote: (title: string, content: string, type: 'text' | 'checklist', items: any[], q: string, color: string) => void;
    toggleNoteItem: (noteId: number, itemId: number) => void;
    updateNote: (id: number, updates: Partial<Note>) => void;
}

// Pequeño panel de "no debo olvidar esto" arriba de Agenda -- es la MISMA
// lista "Pendientes" que ya existe en Listas (busca por título, la crea si
// no existe todavía), para no terminar con un tercer lugar distinto donde
// buscar tareas sueltas (Keep, Listas, y ahora Agenda por separado).
const PendientesWidget = ({ notes, addNote, toggleNoteItem, updateNote }: { notes: Note[]; addNote: AgendaProps['addNote']; toggleNoteItem: AgendaProps['toggleNoteItem']; updateNote: AgendaProps['updateNote'] }) => {
    const movil = useIsMobile();
    const [nuevoTexto, setNuevoTexto] = useState('');
    const [showDone, setShowDone] = useState(false);

    const lista = notes.find(n => n.type === 'checklist' && n.title.trim().toLowerCase() === 'pendientes');
    const pendientes = lista?.items.filter(it => !it.completed) ?? [];
    const hechos = lista?.items.filter(it => it.completed) ?? [];

    const agregar = () => {
        const texto = nuevoTexto.trim();
        if (!texto) return;
        if (!lista) {
            addNote('Pendientes', '', 'checklist', [{ text: texto, completed: false }], '', '#FFFFFF');
        } else {
            updateNote(lista.id, { items: [...lista.items, { id: Date.now() + Math.random(), text: texto, completed: false }] });
        }
        setNuevoTexto('');
    };

    const quitar = (itemId: number) => {
        if (!lista) return;
        updateNote(lista.id, { items: lista.items.filter(it => it.id !== itemId) });
    };

    return (
        <div style={{ ...bento, padding: '0.55rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <ListTodo size={14} color={C.secondary} />
                <span style={etiqueta}>Notas{pendientes.length > 0 ? ` (${pendientes.length})` : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '220px', overflowY: 'auto' }}>
                {pendientes.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0' }}>
                        <div
                            onClick={() => toggleNoteItem(lista!.id, item.id)}
                            style={{ width: '16px', height: '16px', borderRadius: '5px', flexShrink: 0, cursor: 'pointer', border: `2px solid ${C.outlineVariant}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        />
                        <span style={{ flex: 1, fontSize: '0.82rem', color: C.onSurface }}>{item.text}</span>
                        <button onClick={() => quitar(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outlineVariant, padding: '2px', display: 'flex', flexShrink: 0 }}>
                            <X size={13} />
                        </button>
                    </div>
                ))}
            </div>
            {hechos.length > 0 && (
                <div>
                    <button onClick={() => setShowDone(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: C.outline, fontSize: '0.68rem', fontWeight: 700 }}>
                        <ChevronDown size={12} style={{ transform: showDone ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} /> Hechos ({hechos.length})
                    </button>
                    {showDone && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                            {hechos.map(item => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0' }}>
                                    <div
                                        onClick={() => toggleNoteItem(lista!.id, item.id)}
                                        style={{ width: '16px', height: '16px', borderRadius: '5px', flexShrink: 0, cursor: 'pointer', border: `2px solid ${C.secondary}`, background: C.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Check size={11} color="white" strokeWidth={3} />
                                    </div>
                                    <span style={{ flex: 1, fontSize: '0.82rem', color: C.outline, textDecoration: 'line-through' }}>{item.text}</span>
                                    <button onClick={() => quitar(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outlineVariant, padding: '2px', display: 'flex', flexShrink: 0 }}>
                                        <X size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            <div style={{ display: 'flex', gap: '6px' }}>
                <input
                    placeholder="+ agregar nota..."
                    value={nuevoTexto}
                    onChange={e => setNuevoTexto(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && agregar()}
                    style={{ ...campo(movil), flex: 1, padding: '4px 9px', minHeight: '32px', fontSize: '0.78rem' }}
                />
                <button onClick={agregar} style={{ background: C.surfaceContainerLow, border: 'none', borderRadius: '7px', padding: '4px 9px', minHeight: '32px', cursor: 'pointer', color: C.onSurfaceVariant, display: 'flex', alignItems: 'center' }}>
                    <Plus size={14} />
                </button>
            </div>
        </div>
    );
};

const hoyISO = () => new Date().toLocaleDateString('en-CA');

// Al cambiar la hora de inicio, la de fin se mueve con ella conservando la
// duración que ya había (90 min si no hay una válida), sin pasar de 23:59.
const aMinutos = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const deMinutos = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
const finAlMoverInicio = (inicioViejo: string, finViejo: string, inicioNuevo: string) => {
    if (!inicioNuevo) return finViejo;
    let dur = inicioViejo && finViejo ? aMinutos(finViejo) - aMinutos(inicioViejo) : 0;
    if (!(dur > 0)) dur = 90;
    return deMinutos(Math.min(aMinutos(inicioNuevo) + dur, 23 * 60 + 59));
};

const hora12 = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

// Una sola lista como Google Calendar: "9:00am", "9:15am"… de 15 en 15 minutos.
// El valor sigue siendo "HH:mm" de 24 h.
const hora12corta = (t: string) => hora12(t).replace(' AM', 'am').replace(' PM', 'pm');
const OPCIONES_HORA = Array.from({ length: 96 }, (_, i) => deMinutos(i * 15));

// Interpreta lo que se escribe: "9:20am", "930 pm", "14:05", "9". Sin am/pm y con
// hora <= 12 conserva el periodo (AM/PM) que ya tenía la hora anterior.
const parsearHora = (texto: string, previa: string): string | null => {
    const m = texto.trim().toLowerCase().replace(/\s+/g, '').replace(/\./g, '').match(/^(\d{1,2})(?::?(\d{2}))?(a|p)?m?$/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    if (min > 59 || h > 23) return null;
    if (m[3]) {
        if (h < 1 || h > 12) return null;
        h = (h % 12) + (m[3] === 'p' ? 12 : 0);
    } else if (h >= 1 && h <= 12) {
        const eraPM = Number((previa || '09:00').split(':')[0]) >= 12;
        h = (h % 12) + (eraPM ? 12 : 0);
    }
    return deMinutos(h * 60 + min);
};

const CampoHora = ({ value, onChange, movil }: { value: string; onChange: (v: string) => void; movil: boolean }) => {
    const actual = value || '09:00';
    const inputRef = useRef<HTMLInputElement>(null);
    const listaRef = useRef<HTMLDivElement>(null);
    const [borrador, setBorrador] = useState<string | null>(null);
    const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);

    const abrir = () => {
        const r = inputRef.current?.getBoundingClientRect();
        if (!r) return;
        const ancho = Math.max(r.width, 120);
        const abajo = window.innerHeight - r.bottom;
        setPos(abajo < 250 && r.top > abajo
            ? { left: r.left, width: ancho, bottom: window.innerHeight - r.top + 4 }
            : { left: r.left, width: ancho, top: r.bottom + 4 });
    };
    const cerrar = () => { setPos(null); setBorrador(null); };
    const confirmar = (texto: string) => {
        const t = parsearHora(texto, actual);
        if (t) onChange(t);
        cerrar();
    };

    // Al abrir la lista, deja a la vista la hora actual.
    useEffect(() => {
        if (pos) listaRef.current?.querySelector('[data-actual="1"]')?.scrollIntoView({ block: 'center' });
    }, [pos !== null]);

    const opciones = OPCIONES_HORA.includes(actual) ? OPCIONES_HORA : [...OPCIONES_HORA, actual].sort();
    return (
        <>
            <input
                ref={inputRef}
                value={borrador ?? hora12corta(actual)}
                onFocus={abrir}
                onClick={abrir}
                onChange={e => setBorrador(e.target.value)}
                onBlur={e => { if (borrador !== null) confirmar(e.target.value); else cerrar(); }}
                onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                    if (e.key === 'Escape') { e.stopPropagation(); setBorrador(null); (e.target as HTMLInputElement).blur(); }
                }}
                style={{ ...campo(movil), flex: 1, minWidth: 0, textAlign: 'center' }}
            />
            {pos && (
                <div
                    ref={listaRef}
                    // mouseDown con preventDefault: el campo no pierde el foco antes de elegir
                    onMouseDown={e => e.preventDefault()}
                    style={{ position: 'fixed', zIndex: 1100, left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: 240, overflowY: 'auto', background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: RADIO.campo, boxShadow: '0 8px 24px rgba(0,0,0,0.16)', padding: '4px 0' }}
                >
                    {opciones.map(t => (
                        <div
                            key={t}
                            data-actual={t === actual ? '1' : undefined}
                            onClick={() => { onChange(t); cerrar(); inputRef.current?.blur(); }}
                            style={{ padding: '8px 14px', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center', background: t === actual ? C.primaryContainer : 'none', color: t === actual ? C.onPrimaryContainer : C.onSurface, fontWeight: t === actual ? 800 : 500 }}
                        >
                            {hora12corta(t)}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

const formatFecha = (iso: string) => {
    if (!iso) return 'Sin fecha';
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

// Fila de botones para elegir un valor ya existente en Notion (Proyecto,
// Ubicación) sin tener que escribirlo — como el selector de Notion, pero
// sigue siendo posible escribir uno nuevo a mano en el input de al lado.
const OpcionesEditor = ({ options, value, onSelect, onAdd, onRemove, placeholder }: {
    options: string[]; value: string; onSelect: (v: string) => void;
    onAdd: (n: string) => Promise<boolean>; onRemove: (n: string) => Promise<boolean>; placeholder: string;
}) => {
    const [nuevo, setNuevo] = useState('');
    const [adding, setAdding] = useState(false);
    const [gestionar, setGestionar] = useState(false);
    const [busy, setBusy] = useState(false);
    const agregar = async () => {
        const n = nuevo.trim();
        if (!n) return;
        setBusy(true);
        if (await onAdd(n)) { onSelect(n); setNuevo(''); setAdding(false); }
        setBusy(false);
    };
    const quitar = async (o: string) => {
        if (!window.confirm(`¿Borrar "${o}" de Notion? Las sesiones que lo usan quedarán sin este valor.`)) return;
        setBusy(true);
        if (await onRemove(o) && value === o) onSelect('');
        setBusy(false);
    };
    return (
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', width: '100%', alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
            {options.map(opt => {
                const act = opt === value;
                return (
                    <span key={opt} style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${act ? C.primary : C.outlineVariant}`, background: act ? C.primaryContainer : 'none', borderRadius: RADIO.chip, overflow: 'hidden' }}>
                        <button type="button" onClick={() => onSelect(act ? '' : opt)} style={{ border: 'none', background: 'none', color: act ? C.onPrimaryContainer : C.onSurfaceVariant, padding: gestionar ? '5px 4px 5px 11px' : '5px 11px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{opt}</button>
                        {gestionar && <button type="button" disabled={busy} onClick={() => quitar(opt)} title={`Borrar ${opt}`} style={{ border: 'none', background: 'none', color: C.rojo, padding: '4px 7px 4px 2px', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>}
                    </span>
                );
            })}
            {gestionar && (adding ? (
                <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    <input autoFocus value={nuevo} placeholder={placeholder} onChange={e => setNuevo(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') agregar(); if (e.key === 'Escape') setAdding(false); }} style={{ border: `1px solid ${C.outlineVariant}`, borderRadius: RADIO.chip, padding: '4px 10px', fontSize: '0.72rem', fontFamily: 'inherit', width: '130px', background: 'none', color: C.onSurface }} />
                    <button type="button" disabled={busy} onClick={agregar} style={{ border: 'none', background: 'none', color: C.primary, cursor: 'pointer', display: 'flex' }}><Check size={15} /></button>
                    <button type="button" onClick={() => { setAdding(false); setNuevo(''); }} style={{ border: 'none', background: 'none', color: C.outline, cursor: 'pointer', display: 'flex' }}><X size={14} /></button>
                </span>
            ) : (
                <button type="button" onClick={() => setAdding(true)} style={{ border: `1px dashed ${C.primary}`, background: 'none', color: C.primary, borderRadius: RADIO.chip, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Plus size={11} /> Nuevo</button>
            ))}
            <button type="button" onClick={() => { setGestionar(g => !g); setAdding(false); }} style={{ border: 'none', background: 'none', color: gestionar ? C.primary : C.outline, fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 2px', marginLeft: 'auto' }}>
                {gestionar ? 'Listo' : 'Editar lista'}
            </button>
        </div>
    );
};

const PanelLateral = ({ titulo, onClose, pie, children, movil }: { titulo: string; onClose: () => void; pie: React.ReactNode; children: React.ReactNode; movil: boolean }) => {
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onClose]);
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
            <style>{`
                @keyframes agenda-fade { from { opacity: 0 } to { opacity: 1 } }
                @keyframes agenda-slide-x { from { transform: translateX(100%) } to { transform: none } }
                @keyframes agenda-slide-y { from { transform: translateY(100%) } to { transform: none } }
            `}</style>
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(15,30,25,0.38)', animation: 'agenda-fade 0.18s ease-out' }} />
            <div
                role="dialog"
                aria-label={titulo}
                style={{
                    position: 'absolute', background: C.surfaceLowest, display: 'flex', flexDirection: 'column',
                    boxShadow: '0 0 40px rgba(0,0,0,0.18)',
                    ...(movil
                        ? { left: 0, right: 0, bottom: 0, maxHeight: '92vh', borderRadius: `${RADIO.modal} ${RADIO.modal} 0 0`, animation: 'agenda-slide-y 0.22s ease-out' }
                        : { top: 0, right: 0, bottom: 0, width: 'min(460px, 100vw)', borderRadius: `${RADIO.modal} 0 0 ${RADIO.modal}`, animation: 'agenda-slide-x 0.22s ease-out' }),
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.2rem', borderBottom: `1px solid ${C.surfaceContainer}` }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: C.onSurface }}>{titulo}</h3>
                    <button onClick={onClose} aria-label="Cerrar" style={{ background: C.surfaceContainerLow, border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.onSurfaceVariant }}>
                        <X size={16} />
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>{children}</div>
                <div style={{ padding: '0.8rem 1.2rem', borderTop: `1px solid ${C.surfaceContainer}`, display: 'flex', gap: '0.5rem', flexDirection: movil ? 'column-reverse' : 'row', justifyContent: 'flex-end' }}>{pie}</div>
            </div>
        </div>
    );
};

const Seccion = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <div style={{ ...etiqueta }}>{titulo}</div>
        {children}
    </div>
);

export const AgendaDashboard = ({ calendarEvents, addCalendarEvent, removeCalendarEvent, updateCalendarEvent, preferences, updatePreference, notes, addNote, toggleNoteItem, updateNote }: AgendaProps) => {
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
    const [editingAllId, setEditingAllId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ title: '', date: '', startTime: '', endTime: '', description: '', proyecto: '', ubicacion: '', precio: '', cobrado: '', celular: '' });
    const [savingAllId, setSavingAllId] = useState<number | null>(null);
    const [editErrorId, setEditErrorId] = useState<number | null>(null);
    const [opcionError, setOpcionError] = useState(false);
    const itemEditando = editingAllId !== null ? (calendarEvents || []).find(e => e.id === editingAllId) : undefined;
    const panelAbierto = showAddForm || !!itemEditando;
    const formPanel = itemEditando ? editForm : form;
    const setFormPanel = itemEditando ? setEditForm : setForm;
    const guardandoPanel = itemEditando ? savingAllId === itemEditando.id : creating;
    const panelConNotion = itemEditando ? !!itemEditando.notionId : crearEnNotion;
    const cerrarPanel = () => { setShowAddForm(false); setEditingAllId(null); setCreateError(false); setEditErrorId(null); };
    const [abonandoId, setAbonandoId] = useState<number | null>(null);
    const [abonoMonto, setAbonoMonto] = useState('');
    const [savingAbonoId, setSavingAbonoId] = useState<number | null>(null);
    const [abonoErrorId, setAbonoErrorId] = useState<number | null>(null);
    const [editingMeta, setEditingMeta] = useState(false);
    const [infoResumen, setInfoResumen] = useState(false);
    const [verNotas, setVerNotas] = useState(false);
    const [metaInput, setMetaInput] = useState('');
    const [notionOptions, setNotionOptions] = useState<{ proyecto: string[]; ubicacion: string[] } | null>(null);
    const [opcionesFallo, setOpcionesFallo] = useState(false);

    // El campo notionSyncEnabled falta en documentos viejos de Firestore (se
    // agregó después) — el resto del pipeline (webhook, script de sync) ya lo
    // trata así, con `=== false` en vez de un check de verdad, para no tratar
    // "nunca se tocó" como "lo desactivé a propósito".
    const notionActive = preferences.notionSyncEnabled !== false;

    // Trae las opciones reales de "Proyecto"/"Ubicación" desde Notion la
    // primera vez que se abre el formulario con creación en Notion activa,
    // para poder mostrarlas como botones en vez de que se escriban a mano.
    useEffect(() => {
        const quiereOpciones = (showAddForm && crearEnNotion) || editingAllId !== null;
        if (!quiereOpciones || !notionActive || notionOptions) return;
        setOpcionesFallo(false);
        fetch('/api/get-notion-options')
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data) setNotionOptions(data); else setOpcionesFallo(true); })
            .catch(() => setOpcionesFallo(true));
    }, [showAddForm, crearEnNotion, editingAllId, notionActive, notionOptions]);

    // Agrega/quita una opción de los selects de Notion y refleja el resultado local.
    const gestionarOpcion = async (campo: 'proyecto' | 'ubicacion', accion: 'add' | 'remove', nombre: string) => {
        setOpcionError(false);
        try {
            const res = await fetch('/api/manage-notion-option', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campo, accion, nombre })
            });
            if (!res.ok) throw new Error('respuesta no ok');
            const data = await res.json();
            setNotionOptions(o => ({ proyecto: o?.proyecto ?? [], ubicacion: o?.ubicacion ?? [], [campo]: data.opciones }));
            return true;
        } catch (err) {
            console.error('No se pudo actualizar las opciones en Notion:', err);
            setOpcionError(true);
            return false;
        }
    };
    const opcionesProps = (campo: 'proyecto' | 'ubicacion') => ({
        options: notionOptions?.[campo] ?? [],
        onAdd: (n: string) => gestionarOpcion(campo, 'add', n),
        onRemove: (n: string) => gestionarOpcion(campo, 'remove', n),
    });

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

    // Sesiones que existen en Notion pero sin "Fecha y hora" todavía — antes el
    // sync las descartaba y quedaban invisibles; ahora entran con date '' y se
    // muestran arriba en su propia sección "Por agendar" para no olvidarlas.
    const porAgendar = useMemo(
        () => items.filter(e => !e.date).sort((a, b) => a.title.localeCompare(b.title)),
        [items]
    );

    const proximos = useMemo(
        () => items.filter(e => e.date && (e.date >= hoy || !yaSucedio(e))),
        [items, hoy]
    );
    const pasados = useMemo(
        () => [...items].filter(e => e.date && e.date < hoy && yaSucedio(e)).reverse(),
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

    // Sesiones del mes en curso, sin importar si ya pasaron o están por venir.
    const mesActual = hoy.slice(0, 7); // YYYY-MM
    const sesionesEsteMes = items.filter(e => e.date.startsWith(mesActual));
    const sesionesEsteMesCount = sesionesEsteMes.length;
    const metaSesiones = preferences.metaSesionesMes;

    const guardarMeta = () => {
        const n = parseInt(metaInput, 10);
        updatePreference('metaSesionesMes', Number.isFinite(n) && n > 0 ? n : undefined);
        setEditingMeta(false);
    };

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
        // Si es una sesión "por agendar" (sin fecha), arranca el formulario con
        // valores por defecto en vez de campos vacíos.
        // Si la fecha ya pasó (sesión atrasada) arranca en hoy: con la fecha vieja
        // puesta, guardar sin tocarla la dejaba igual de atrasada.
        setDateForm({
            date: item.date && item.date >= hoyISO() ? item.date : hoyISO(),
            startTime: item.startTime || '09:00',
            endTime: item.endTime || '10:30',
        });
        setEditingDateId(item.id);
    };

    const handleReagendar = async (item: CalendarEvent) => {
        if (!dateForm.date) return;
        if (item.notionId) {
            setSavingDateId(item.id);
            setDateErrorId(null);
            try {
                // La fecha de antes se guarda una sola vez (la primera vez que se
                // reagenda) en "Fecha original" de Notion; las siguientes la respetan.
                const cambioFecha = !!item.date && item.date !== dateForm.date;
                const fechaOriginal = cambioFecha && !item.notionFechaOriginal ? item.date : undefined;
                const res = await fetch('/api/update-notion-date', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notionId: item.notionId, ...dateForm, fechaOriginal })
                });
                if (!res.ok) throw new Error('respuesta no ok');
                updateCalendarEvent(item.id, { ...dateForm, ...(fechaOriginal ? { notionFechaOriginal: fechaOriginal } : {}) });
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

    const openEditar = (item: CalendarEvent) => {
        setEditErrorId(null);
        setEditForm({
            title: item.notionId ? (item.notionTitulo ?? item.title) : item.title,
            date: item.date, startTime: item.startTime, endTime: item.endTime,
            description: item.description ?? '',
            proyecto: item.notionProyecto ?? '', ubicacion: item.notionUbicacion ?? '',
            precio: item.notionPrecio !== undefined ? String(item.notionPrecio) : '',
            cobrado: item.notionCobrado !== undefined ? String(item.notionCobrado) : '',
            celular: item.notionCelular ?? '',
        });
        setShowAddForm(false);
        setEditingAllId(item.id);
    };

    const handleGuardarEdicion = async (item: CalendarEvent) => {
        const f = editForm;
        const titulo = f.title.trim();
        if (!titulo) return;
        const startTime = f.date ? f.startTime || '09:00' : '';
        const endTime = f.date ? f.endTime || '10:30' : '';
        if (!item.notionId) {
            updateCalendarEvent(item.id, { title: titulo, date: f.date, startTime, endTime, description: f.description.trim() });
            setEditingAllId(null);
            return;
        }
        setSavingAllId(item.id);
        setEditErrorId(null);
        try {
            const res = await fetch('/api/update-notion-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    notionId: item.notionId, title: titulo, date: f.date, startTime, endTime,
                    proyecto: f.proyecto.trim(), ubicacion: f.ubicacion.trim(),
                    precio: f.precio, cobrado: f.cobrado, celular: f.celular,
                })
            });
            if (!res.ok) throw new Error('respuesta no ok');
            const precio = f.precio === '' ? undefined : Number(f.precio);
            const cobrado = f.cobrado === '' ? undefined : Number(f.cobrado);
            const ubic = f.ubicacion.trim();
            const cambioFecha = !!item.date && !!f.date && item.date !== f.date;
            updateCalendarEvent(item.id, {
                title: ubic ? `${titulo} (${ubic})` : titulo,
                notionTitulo: titulo, notionUbicacion: ubic || undefined,
                date: f.date, startTime, endTime,
                notionProyecto: f.proyecto.trim() || undefined,
                notionPrecio: precio, notionCobrado: cobrado,
                notionSaldoPorCobrar: precio !== undefined ? Math.max(0, precio - (cobrado || 0)) : undefined,
                notionCelular: f.celular.replace(/\D/g, '') || undefined,
                ...(cambioFecha && !item.notionFechaOriginal ? { notionFechaOriginal: item.date } : {}),
            });
            setEditingAllId(null);
        } catch (err) {
            console.error('No se pudo guardar la edición en Notion:', err);
            setEditErrorId(item.id);
        } finally {
            setSavingAllId(null);
        }
    };

    const openAbonar = (item: CalendarEvent) => {
        setAbonoErrorId(null);
        setAbonoMonto('');
        setAbonandoId(item.id);
    };

    // Registra un abono (adelanto/pago) sobre "Cobrado". Notion sigue siendo la
    // fuente de verdad — "Saldo por cobrar" es una fórmula allá (Precio - Cobrado),
    // así que aquí solo la recalculamos localmente para reflejarla al toque.
    const handleAbonar = async (item: CalendarEvent) => {
        const monto = parseFloat(abonoMonto);
        if (!monto || monto <= 0) return;
        const nuevoCobrado = (item.notionCobrado || 0) + monto;
        const nuevoSaldo = item.notionPrecio !== undefined ? Math.max(0, item.notionPrecio - nuevoCobrado) : undefined;

        if (!item.notionId) {
            updateCalendarEvent(item.id, { notionCobrado: nuevoCobrado, notionSaldoPorCobrar: nuevoSaldo });
            setAbonandoId(null);
            return;
        }

        setSavingAbonoId(item.id);
        setAbonoErrorId(null);
        try {
            const res = await fetch('/api/update-notion-cobrado', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notionId: item.notionId, cobrado: nuevoCobrado })
            });
            if (!res.ok) throw new Error('respuesta no ok');
            updateCalendarEvent(item.id, { notionCobrado: nuevoCobrado, notionSaldoPorCobrar: nuevoSaldo });
            setAbonandoId(null);
        } catch (err) {
            console.error('No se pudo registrar el abono en Notion:', err);
            setAbonoErrorId(item.id);
        } finally {
            setSavingAbonoId(null);
        }
    };

    const renderCard = (item: CalendarEvent) => {
        const sinFecha = !item.date;
        const isPast = !sinFecha && item.date < hoy;
        const isExpanded = expandedId === item.id;
        const isAtrasada = isPast && !yaSucedio(item);
        const isEditingDate = editingDateId === item.id;
        return (
            <div key={item.id} style={{ ...bento, padding: '0.85rem 1rem', opacity: isPast && !isAtrasada ? 0.7 : 1, ...(isAtrasada ? { borderColor: C.rojo } : sinFecha ? { borderColor: C.ambar } : {}) }}>
                <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', cursor: 'pointer' }}
                >
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: C.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '3px', fontSize: '0.72rem', color: C.onSurfaceVariant, fontWeight: 700 }}>
                            <span>{sinFecha ? 'Sin fecha asignada' : `${formatFecha(item.date)} · ${hora12(item.startTime)}`}</span>
                            {sinFecha && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: C.ambar, fontWeight: 800 }}>
                                    <CalendarClock size={11} /> Por agendar
                                </span>
                            )}
                            {isAtrasada && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: C.rojo, fontWeight: 800 }}>
                                    <AlertTriangle size={11} /> Atrasada — no se hizo, reagéndala
                                </span>
                            )}
                            {!sinFecha && item.notionFechaOriginal && item.notionFechaOriginal !== item.date && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: C.ambar, fontWeight: 800 }}>
                                    <CalendarClock size={11} /> Reagendada · era {formatFecha(item.notionFechaOriginal)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); isEditingDate ? setEditingDateId(null) : openReagendar(item); }}
                            title={sinFecha ? 'Agendar' : 'Reagendar'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: isAtrasada ? C.rojo : sinFecha ? C.ambar : C.outline, padding: '4px', display: 'flex' }}
                        >
                            <CalendarClock size={15} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); openEditar(item); }}
                            title="Editar"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '4px', display: 'flex' }}
                        >
                            <Pencil size={15} />
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

                {/* Cobro — siempre visible (no hace falta expandir la tarjeta) para
                    ver de un vistazo cuánto ya pagaron y cuánto falta, con abono directo. */}
                {item.notionPrecio !== undefined && (
                    <div onClick={e => e.stopPropagation()} style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: `1px solid ${C.surfaceContainer}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: '0.72rem', color: C.onSurfaceVariant, fontWeight: 700 }}>
                                Cobrado {money(item.notionCobrado || 0)} de {money(item.notionPrecio)}
                                {(item.notionSaldoPorCobrar ?? 0) > 0 ? (
                                    <span style={{ color: C.rojo }}> · falta {money(item.notionSaldoPorCobrar!)}</span>
                                ) : (
                                    <span style={{ color: C.verde }}> · pagado completo</span>
                                )}
                            </div>
                            {abonandoId !== item.id && (item.notionSaldoPorCobrar ?? 0) > 0 && (
                                <button
                                    onClick={() => openAbonar(item)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.primary, fontSize: '0.72rem', fontWeight: 800 }}
                                >
                                    <Wallet size={13} /> Abonar
                                </button>
                            )}
                        </div>
                        <div style={{ height: '5px', borderRadius: '999px', background: C.surfaceContainer, overflow: 'hidden', marginTop: '5px' }}>
                            <div style={{
                                height: '100%',
                                width: `${item.notionPrecio > 0 ? Math.min(100, ((item.notionCobrado || 0) / item.notionPrecio) * 100) : 0}%`,
                                background: (item.notionSaldoPorCobrar ?? 0) > 0 ? C.ambar : C.verde,
                                borderRadius: '999px',
                            }} />
                        </div>
                        {abonandoId === item.id && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '0.5rem' }}>
                                <input
                                    autoFocus
                                    type="number"
                                    placeholder={`Máx. ${(item.notionSaldoPorCobrar ?? 0).toFixed(2)}`}
                                    value={abonoMonto}
                                    onChange={e => setAbonoMonto(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAbonar(item)}
                                    style={{ ...campo(movil), flex: 1, padding: '6px 8px', fontSize: '0.78rem' }}
                                />
                                <button
                                    onClick={() => setAbonoMonto(String(item.notionSaldoPorCobrar ?? 0))}
                                    style={{ padding: '6px 8px', borderRadius: RADIO.chip, border: 'none', background: C.surfaceContainerLow, color: C.onSurfaceVariant, fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                >
                                    Todo
                                </button>
                                <button
                                    onClick={() => handleAbonar(item)}
                                    disabled={savingAbonoId === item.id}
                                    style={{ ...botonCompactoPrimario(movil), padding: '6px 10px', opacity: savingAbonoId === item.id ? 0.7 : 1 }}
                                >
                                    {savingAbonoId === item.id ? <Loader2 size={13} className="agenda-spin" /> : 'Abonar'}
                                </button>
                                <button onClick={() => setAbonandoId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, padding: '4px', display: 'flex' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        {abonoErrorId === item.id && (
                            <div style={{ fontSize: '0.7rem', color: C.rojo, fontWeight: 700, marginTop: '0.35rem' }}>No se pudo registrar el abono en Notion. Intenta de nuevo.</div>
                        )}
                    </div>
                )}

                {isEditingDate && (
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: `1px solid ${C.surfaceContainer}` }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input type="date" value={dateForm.date} onChange={e => setDateForm(f => ({ ...f, date: e.target.value }))} style={{ ...campo(movil), flex: '1 1 130px' }} />
                            <CampoHora movil={movil} value={dateForm.startTime} onChange={v => setDateForm(f => ({ ...f, startTime: v, endTime: finAlMoverInicio(f.startTime, f.endTime, v) }))} />
                            <CampoHora movil={movil} value={dateForm.endTime} onChange={v => setDateForm(f => ({ ...f, endTime: v }))} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => handleReagendar(item)}
                                disabled={savingDateId === item.id}
                                style={{ ...botonCompactoPrimario(movil), opacity: savingDateId === item.id ? 0.7 : 1 }}
                            >
                                {savingDateId === item.id ? <Loader2 size={14} className="agenda-spin" /> : <CalendarClock size={14} />}
                                {sinFecha ? 'Agendar sesión' : 'Guardar nueva fecha'}
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
                        {item.notionEntregaFecha && <div><b>Entrega:</b> {formatFecha(item.notionEntregaFecha)}</div>}
                        {item.notionDiasRestantes && <div><b>Días restantes:</b> {item.notionDiasRestantes}</div>}
                        {!sinFecha && <div>{hora12(item.startTime)} – {hora12(item.endTime)}</div>}
                    </div>
                )}
            </div>
        );
    };

    // En móvil las tarjetas van planas, como columnas de UNA sola tarjeta (separadas por una línea fina).
    const tarjetaResumen: React.CSSProperties = { display: 'flex', gap: '7px', alignItems: 'center', padding: '0.1rem 0.75rem', flex: '1 0 88px', minWidth: 0, borderLeft: `1px solid ${C.outlineVariant}` };
    const notasPendientes = (notes.find(n => n.type === 'checklist' && n.title.trim().toLowerCase() === 'pendientes')?.items ?? []).filter(it => !it.completed).length;
    const botonChico: React.CSSProperties = { padding: '5px 10px', minHeight: '32px', fontSize: '0.75rem', whiteSpace: 'nowrap' };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: movil ? "0.6rem" : "1.5rem", ...paddingPagina(movil), color: "var(--text-carbon)" }}>
            {/* Misma cápsula blanca de una sola fila que Finanzas/Entregas: título +
                controles, todo al mismo nivel en vez de flotar sobre el fondo. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: movil ? 'wrap' : 'nowrap', background: 'white', padding: '10px 14px', borderRadius: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ flexShrink: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: C.onSurface, whiteSpace: 'nowrap' }}>Agenda</h2>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: C.onSurfaceVariant, fontWeight: 600, whiteSpace: movil ? 'normal' : 'nowrap' }}>Tus próximas sesiones y entregas, a un vistazo.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: movil ? '0.4rem' : '0.6rem', flexWrap: 'nowrap', justifyContent: 'flex-end', marginLeft: 'auto', ...(movil ? { flex: '1 1 100%' } : {}) }}>
                    {!notionActive ? (
                        <button onClick={handleActivar} style={{ ...botonCompacto(movil), ...botonChico, background: C.verde, color: '#fff' }}>
                            Activar
                        </button>
                    ) : (
                        <button onClick={handleSync} disabled={syncing} title="Sincronizar con Notion" style={{ ...botonCompactoPrimario(movil), ...botonChico, padding: '5px 9px', opacity: syncing ? 0.7 : 1, cursor: syncing ? 'wait' : 'pointer' }}>
                            {syncing ? <Loader2 size={13} className="agenda-spin" /> : <RefreshCw size={13} />}
                            
                        </button>
                    )}
                    <button onClick={() => { setEditingAllId(null); setShowAddForm(true); }} style={{ ...botonCompactoPrimario(movil), ...botonChico }}>
                        <Plus size={15} />
                        Agregar
                    </button>
                    {(
                        <button onClick={() => setVerNotas(v => !v)} style={{ ...botonCompacto(movil), ...botonChico, background: verNotas ? C.primaryContainer : C.surfaceContainerHigh, color: verNotas ? C.onPrimaryContainer : C.onSurfaceVariant }}>
                            <ListTodo size={14} />
                            Notas{notasPendientes > 0 ? ` (${notasPendientes})` : ''}
                        </button>
                    )}
                </div>
            </div>
            {syncMsg && (
                <div style={{ fontSize: '0.72rem', color: syncError ? C.rojo : C.outline, fontWeight: 600, marginTop: '-0.6rem' }}>{syncMsg}</div>
            )}



            {panelAbierto && (
                <PanelLateral
                    movil={movil}
                    titulo={itemEditando ? 'Editar sesión' : 'Nueva sesión'}
                    onClose={cerrarPanel}
                    pie={
                        <>
                            <button onClick={cerrarPanel} style={{ ...botonCompactoSecundario(movil), justifyContent: 'center' }}>Cancelar</button>
                            <button
                                onClick={() => itemEditando ? handleGuardarEdicion(itemEditando) : handleAdd()}
                                disabled={guardandoPanel || !formPanel.title.trim()}
                                style={{ ...botonCompactoPrimario(movil), justifyContent: 'center', opacity: guardandoPanel || !formPanel.title.trim() ? 0.6 : 1 }}
                            >
                                {guardandoPanel ? <Loader2 size={16} className="agenda-spin" /> : itemEditando ? <Check size={16} /> : <Plus size={16} />}
                                {itemEditando ? 'Guardar cambios' : crearEnNotion ? 'Crear en Notion' : 'Guardar solo en la agenda'}
                            </button>
                        </>
                    }
                >
                    {!itemEditando && (
                        <div
                            onClick={() => setCrearEnNotion(v => !v)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '0.5rem 0.7rem', background: crearEnNotion ? 'rgba(16,185,129,0.08)' : C.surfaceContainerLow, borderRadius: '10px' }}
                        >
                            <div style={{ width: 34, height: 20, borderRadius: '10px', flexShrink: 0, position: 'relative', background: crearEnNotion ? C.verde : '#D1D5DB', transition: 'background 0.2s' }}>
                                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: crearEnNotion ? 16 : 2, transition: 'left 0.2s' }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: C.onSurfaceVariant }}>
                                {crearEnNotion ? 'Se crea también en Notion' : 'Solo en esta Agenda (no toca Notion)'}
                            </span>
                        </div>
                    )}
                    <input
                        autoFocus
                        placeholder="Título (ej. Sesión de fotos — Boda Ana & Luis)"
                        value={formPanel.title}
                        onChange={e => setFormPanel(f => ({ ...f, title: e.target.value }))}
                        style={{ ...campo(movil), fontWeight: 700 }}
                    />
                    <Seccion titulo="Cuándo">
                        <input type="date" value={formPanel.date} onChange={e => setFormPanel(f => ({ ...f, date: e.target.value }))} style={campo(movil)} />
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <CampoHora movil={movil} value={formPanel.startTime} onChange={v => setFormPanel(f => ({ ...f, startTime: v, endTime: finAlMoverInicio(f.startTime, f.endTime, v) }))} />
                            <span style={{ color: C.outline, fontWeight: 700 }}>–</span>
                            <CampoHora movil={movil} value={formPanel.endTime} onChange={v => setFormPanel(f => ({ ...f, endTime: v }))} />
                        </div>
                    </Seccion>
                    {panelConNotion ? (
                        <>
                            <Seccion titulo="Proyecto">
                                {notionOptions
                                    ? <OpcionesEditor {...opcionesProps('proyecto')} value={formPanel.proyecto} onSelect={v => setFormPanel(f => ({ ...f, proyecto: v }))} placeholder="Nuevo proyecto" />
                                    : <div style={{ fontSize: '0.72rem', color: opcionesFallo ? C.rojo : C.outline }}>{opcionesFallo ? 'No se pudieron traer las opciones de Notion.' : 'Cargando…'}</div>}
                            </Seccion>
                            <Seccion titulo="Ubicación">
                                {notionOptions && <OpcionesEditor {...opcionesProps('ubicacion')} value={formPanel.ubicacion} onSelect={v => setFormPanel(f => ({ ...f, ubicacion: v }))} placeholder="Nueva ubicación" />}
                            </Seccion>
                            {opcionError && <div style={{ fontSize: '0.7rem', color: C.rojo, fontWeight: 700 }}>No se pudo actualizar la lista en Notion.</div>}
                            <Seccion titulo="Cliente y cobro">
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: C.onSurfaceVariant }}>Celular
                                    <input type="tel" placeholder="Opcional" value={formPanel.celular} onChange={e => setFormPanel(f => ({ ...f, celular: e.target.value }))} style={{ ...campo(movil), width: '100%', boxSizing: 'border-box', marginTop: 3 }} />
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <label style={{ flex: 1, minWidth: 0, fontSize: '0.72rem', fontWeight: 700, color: C.onSurfaceVariant }}>Precio (S/)
                                        <input type="number" placeholder="0" value={formPanel.precio} onChange={e => setFormPanel(f => ({ ...f, precio: e.target.value }))} style={{ ...campo(movil), width: '100%', boxSizing: 'border-box', marginTop: 3 }} />
                                    </label>
                                    <label style={{ flex: 1, minWidth: 0, fontSize: '0.72rem', fontWeight: 700, color: C.onSurfaceVariant }}>Cobrado (S/)
                                        <input type="number" placeholder="0" value={formPanel.cobrado} onChange={e => setFormPanel(f => ({ ...f, cobrado: e.target.value }))} style={{ ...campo(movil), width: '100%', boxSizing: 'border-box', marginTop: 3 }} />
                                    </label>
                                </div>
                            </Seccion>
                        </>
                    ) : (
                        <Seccion titulo="Notas">
                            <input placeholder="Descripción (opcional)" value={formPanel.description} onChange={e => setFormPanel(f => ({ ...f, description: e.target.value }))} style={campo(movil)} />
                        </Seccion>
                    )}
                    {(createError || editErrorId !== null) && (
                        <div style={{ fontSize: '0.72rem', color: C.rojo, fontWeight: 700 }}>No se pudo guardar en Notion. Intenta de nuevo.</div>
                    )}
                </PanelLateral>
            )}

            {/* Por agendar — sesiones que ya están en Notion pero sin "Fecha y hora".
                Van arriba de todo para que no se olviden: hay que ponerles fecha para
                que entren a la agenda de verdad. */}
            {porAgendar.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                    <div style={{ ...etiqueta, display: 'flex', alignItems: 'center', gap: '6px', color: C.ambar }}>
                        <CalendarClock size={13} /> Por agendar ({porAgendar.length})
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: C.onSurfaceVariant, fontWeight: 600 }}>
                        Están en Notion sin fecha. Ponles una para que entren a tu agenda.
                    </p>
                    {porAgendar.map(item => renderCard(item))}
                </div>
            )}

            {/* Pendientes a la izquierda, los detalles (próxima sesión/entrega/etc.) a
                la derecha en su propia grilla — antes iban uno full-width encima del
                otro; ahora quedan lado a lado en vez de montados. */}
            <div style={{ display: 'grid', gridTemplateColumns: (verNotas && !movil) ? '1fr 1.5fr' : '1fr', gap: movil ? '0.5rem' : '0.9rem', alignItems: 'start' }}>
            {verNotas && <PendientesWidget notes={notes} addNote={addNote} toggleNoteItem={toggleNoteItem} updateNote={updateNote} />}
            <div style={{ ...bento, display: 'flex', padding: '0.5rem 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
                <div style={{ ...tarjetaResumen, borderLeft: 'none' }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={etiqueta}>Sesión</div>
                        {proximaSesion ? (
                            <>
                                <div style={{ fontWeight: 800, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proximaSesion.title}</div>
                                <div style={{ fontSize: '0.7rem', color: C.onSurfaceVariant, fontWeight: 700 }}>
                                    {formatFecha(proximaSesion.date)} · {hora12(proximaSesion.startTime)}
                                    {' '}({diasRestantes(proximaSesion.date) === 0 ? 'hoy' : `en ${diasRestantes(proximaSesion.date)}d`})
                                </div>
                            </>
                        ) : <div style={{ fontSize: '0.85rem', color: C.outlineVariant, fontWeight: 800 }}>—</div>}
                    </div>
                </div>
                <div style={tarjetaResumen}>
                    <div style={{ minWidth: 0 }}>
                        <div style={etiqueta}>Entrega</div>
                        {proximaEntrega ? (
                            <>
                                <div style={{ fontWeight: 800, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proximaEntrega.title}</div>
                                <div style={{ fontSize: '0.7rem', color: C.onSurfaceVariant, fontWeight: 700 }}>
                                    {formatFecha(proximaEntrega.notionEntregaFecha!)}
                                    {proximaEntrega.notionDiasRestantes ? ` · ${proximaEntrega.notionDiasRestantes}` : ''}
                                </div>
                            </>
                        ) : <div style={{ fontSize: '0.85rem', color: C.outlineVariant, fontWeight: 800 }}>—</div>}
                    </div>
                </div>
                {entregasTotal > 0 && (
                    <div style={tarjetaResumen}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={etiqueta}>Entregas</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                                <span style={{ color: C.verde }}>{entregadosCount} entregados</span>
                                {' · '}
                                <span style={{ color: C.ambar }}>{porEntregarCount} por entregar</span>
                            </div>
                            <BarraProgreso pct={entregasTotal > 0 ? (entregadosCount / entregasTotal) * 100 : 0} />
                            <div style={{ fontSize: '0.68rem', color: C.outline, fontWeight: 600, marginTop: '4px' }}>≈ {porEntregarCount} USBs / recursos</div>
                        </div>
                    </div>
                )}
                <div style={tarjetaResumen}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={etiqueta}>Este mes</div>
                            <button onClick={() => setInfoResumen(v => !v)} title="Qué mide cada número" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: infoResumen ? C.primary : C.outlineVariant }}>
                                <Info size={12} />
                            </button>
                        </div>
                        {editingMeta ? (
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginTop: '2px' }}>
                                <input
                                    type="number"
                                    min={0}
                                    autoFocus
                                    value={metaInput}
                                    onChange={e => setMetaInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') guardarMeta(); if (e.key === 'Escape') setEditingMeta(false); }}
                                    placeholder="ej. 6"
                                    style={{ ...campo(movil), padding: '4px 8px', fontSize: '0.78rem', width: '56px' }}
                                />
                                <button onClick={guardarMeta} style={{ ...botonCompactoPrimario(movil), padding: '4px 9px', fontSize: '0.72rem' }}>OK</button>
                            </div>
                        ) : (
                            <>
                                <div style={{ fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                                    <span style={metaSesiones ? { color: sesionesEsteMesCount >= metaSesiones ? C.verde : 'inherit' } : undefined}>
                                        {metaSesiones ? `${sesionesEsteMesCount} de ${metaSesiones}` : sesionesEsteMesCount}
                                    </span>
                                    <button
                                        onClick={() => { setMetaInput(metaSesiones ? String(metaSesiones) : ''); setEditingMeta(true); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: C.outline, fontSize: '0.66rem', fontWeight: 700, textDecoration: 'underline' }}
                                    >
                                        {metaSesiones ? 'editar meta' : '+ meta'}
                                    </button>
                                </div>
                                {metaSesiones ? <BarraProgreso pct={(sesionesEsteMesCount / metaSesiones) * 100} /> : null}
                            </>
                        )}
                    </div>
                </div>
            </div>
            </div>

            {infoResumen && (
                <div style={{ ...bento, padding: '0.65rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.72rem', color: C.onSurfaceVariant, lineHeight: 1.35 }}>
                    <div><b>Sesión:</b> la próxima sesión que todavía no ocurre.</div>
                    <div><b>Entrega:</b> la entrega pendiente con la fecha más cercana (Entrega en Notion, sin marcar Entregado).</div>
                    <div><b>Este mes:</b> cuántas sesiones tienes con fecha en el mes actual, pasadas y por venir. Con meta, se muestra como «X de meta».</div>
                </div>
            )}

            {/* Próximas — ordenadas por Fecha y hora (la sesión en sí), no por Estado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                <div style={etiqueta}>Próximas ({proximos.length})</div>
                {items.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: C.outline }}>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Sin eventos todavía. Agrega uno o activa Notion arriba.</p>
                    </div>
                )}
                {items.length > 0 && proximos.length === 0 && porAgendar.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: C.outline }}>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Sin sesiones ni entregas por venir.</p>
                    </div>
                )}
                {items.length > 0 && proximos.length === 0 && porAgendar.length > 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: C.outline }}>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Nada con fecha todavía. Agéndalas arriba.</p>
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
