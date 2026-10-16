import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C, RADIO, campo } from '../../theme';
import type { GoalHorizon, Project } from '../../hooks/useAlDiaState';

/* Ventanita para crear o editar una meta o una sub-meta.
   Meta: qué quieres lograr + número (opcional) + visión/rumbo + fecha + área/ícono/color.
   Sub-meta: qué paso concreto + número (opcional) + en qué plazo cae. */

export const ICONOS = ['🎯', '💰', '🏠', '💻', '🌱', '❤️', '📚', '✈️', '🏆', '🛠️'];
export const COLORES = ['#0FA97A', '#4858ab', '#0E9F6E', '#B9760A', '#C77DFF', '#C63C3C', '#4D96FF', '#06D6A0'];
export const AREAS = ['Negocio', 'Finanzas', 'Salud', 'Personal', 'Aprendizaje', 'Familia'];
export const UNIDADES = ['S/', 'clientes', 'personas', 'ventas', 'veces', 'horas', 'kg', '%'];

export interface NuevaMeta {
    title: string; area: string; icon: string; color: string; targetDate: string;
    objetivo: string; actual: string; unidad: string;
    periodo: '' | 'semana' | 'mes';
    projectId?: number;
    horizon: GoalHorizon;
}

const VACIA: NuevaMeta = { title: '', area: 'Personal', icon: ICONOS[0], color: COLORES[0], targetDate: '', objetivo: '', actual: '', unidad: '', periodo: '', horizon: 'corto' };

export const PLAZOS_INFO: { k: GoalHorizon; titulo: string; sub: string }[] = [
    { k: 'corto', titulo: 'Corto plazo', sub: 'este mes' },
    { k: 'mediano', titulo: 'Mediano plazo', sub: 'próximos meses' },
    { k: 'largo', titulo: 'Largo plazo', sub: '1+ años' },
];

const etiqueta: React.CSSProperties = {
    fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.outline, marginBottom: '8px',
};

const chip = (activo: boolean, color: string): React.CSSProperties => ({
    border: 'none', borderRadius: RADIO.chip, padding: '8px 14px', cursor: 'pointer',
    fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit',
    background: activo ? color : C.surfaceContainer, color: activo ? '#fff' : C.onSurfaceVariant,
});

interface Props {
    open: boolean;
    movil: boolean;
    tipo: 'meta' | 'sub';
    inicial?: Partial<NuevaMeta>;   // para editar o para fijar el plazo de una sub-meta nueva
    editando?: boolean;
    padre?: { title: string; color: string; nombresPlazo?: Partial<Record<GoalHorizon, string>> };
    projects?: Project[];
    onCrearVision?: (nombre: string, color: string) => number | void;
    onClose: () => void;
    onSave: (m: NuevaMeta) => void;
}

export const NuevaMetaModal = ({ open, movil, tipo, inicial, editando = false, padre, projects = [], onCrearVision, onClose, onSave }: Props) => {
    const [f, setF] = useState<NuevaMeta>(VACIA);
    const [nuevaVision, setNuevaVision] = useState<string | null>(null);

    useEffect(() => {
        if (open) { setF({ ...VACIA, ...(padre ? { color: padre.color } : {}), ...inicial }); setNuevaVision(null); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [open, onClose]);

    const set = (p: Partial<NuevaMeta>) => setF(v => ({ ...v, ...p }));
    const puede = f.title.trim().length > 0;
    const guardar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!puede) return;
        let projectId = f.projectId;
        if (nuevaVision?.trim() && onCrearVision) {
            const id = onCrearVision(nuevaVision.trim(), f.color);
            if (typeof id === 'number') projectId = id;
        }
        onSave({ ...f, title: f.title.trim(), unidad: f.unidad.trim(), projectId });
    };
    const visiones = projects.filter(p => p.status !== 'completado' || p.id === f.projectId);
    const esSub = tipo === 'sub';

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 10000, display: 'flex',
                        alignItems: movil ? 'flex-end' : 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: movil ? 0 : '20px',
                    }}
                >
                    <motion.form
                        onSubmit={guardar}
                        onClick={e => e.stopPropagation()}
                        initial={{ y: movil ? 60 : 20, opacity: 0, scale: movil ? 1 : 0.96 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: movil ? 60 : 20, opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        style={{
                            background: C.surfaceLowest, width: '100%', maxWidth: '520px', maxHeight: movil ? '92dvh' : '88dvh',
                            overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', boxSizing: 'border-box',
                            borderRadius: movil ? '24px 24px 0 0' : RADIO.modal, padding: movil ? '20px 18px 24px' : '24px',
                            display: 'flex', flexDirection: 'column', gap: '18px',
                        }}
                    >
                        {padre && (
                            <div style={{ ...etiqueta, marginBottom: '-10px', color: padre.color }}>
                                Sub-meta de: {padre.title}
                            </div>
                        )}
                        {/* Cabecera: ícono + título */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0, fontSize: '1.35rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `${f.color}22`, border: `2px solid ${f.color}`,
                            }}>{esSub ? '🎯' : f.icon}</div>
                            <input
                                autoFocus value={f.title} onChange={e => set({ title: e.target.value })}
                                placeholder={esSub ? 'Paso concreto, ej. Conseguir 20 clientes' : '¿Qué quieres lograr?'} enterKeyHint="done"
                                style={{
                                    flex: 1, minWidth: 0, border: 'none', borderBottom: `2px solid ${C.outlineVariant}`, outline: 'none',
                                    background: 'transparent', fontSize: '1.1rem', fontWeight: 700, color: C.onSurface,
                                    padding: '8px 0', fontFamily: 'inherit',
                                }}
                            />
                            <button type="button" onClick={onClose} title="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px' }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Número: cuánto y de qué */}
                        <div>
                            <div style={etiqueta}>¿Cómo la mides? (opcional)</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {editando && (
                                    <>
                                        <input
                                            type="number" inputMode="decimal" value={f.actual} onChange={e => set({ actual: e.target.value })}
                                            placeholder="Llevo" aria-label="Avance actual"
                                            style={{ ...campo(movil), width: '90px', boxSizing: 'border-box', background: C.surfaceContainerLow }}
                                        />
                                        <span style={{ color: C.outline, fontWeight: 700 }}>de</span>
                                    </>
                                )}
                                <input
                                    type="number" inputMode="decimal" value={f.objetivo} onChange={e => set({ objetivo: e.target.value })}
                                    placeholder={esSub ? '20' : '10000'} aria-label="Número objetivo"
                                    style={{ ...campo(movil), width: '100px', boxSizing: 'border-box', background: C.surfaceContainerLow }}
                                />
                                <input
                                    value={f.unidad} onChange={e => set({ unidad: e.target.value })}
                                    placeholder="unidad" aria-label="Unidad" maxLength={14}
                                    style={{ ...campo(movil), width: '110px', boxSizing: 'border-box', background: C.surfaceContainerLow }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                                {UNIDADES.map(u => (
                                    <button type="button" key={u} onClick={() => set({ unidad: f.unidad === u ? '' : u })} style={{ ...chip(f.unidad === u, f.color), padding: '5px 11px', fontSize: '0.72rem' }}>{u}</button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                                {([['', 'En total'], ['semana', 'Por semana'], ['mes', 'Por mes']] as const).map(([k, t]) => (
                                    <button type="button" key={k} onClick={() => set({ periodo: k })} style={chip(f.periodo === k, f.color)}>{t}</button>
                                ))}
                            </div>
                        </div>

                        {esSub ? (
                            <div>
                                <div style={etiqueta}>¿En qué plazo?</div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {PLAZOS_INFO.map(pl => (
                                        <button type="button" key={pl.k} onClick={() => set({ horizon: pl.k })} style={chip(f.horizon === pl.k, f.color)}>
                                            {padre?.nombresPlazo?.[pl.k]?.trim() || pl.titulo}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <div style={etiqueta}>🧭 Visión / rumbo (opcional)</div>
                                    {nuevaVision === null ? (
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            <button type="button" onClick={() => set({ projectId: undefined })} style={chip(!f.projectId, f.color)}>Sin visión</button>
                                            {visiones.map(p => (
                                                <button type="button" key={p.id} onClick={() => set({ projectId: p.id })} style={chip(f.projectId === p.id, f.color)}>{p.name}</button>
                                            ))}
                                            {onCrearVision && (
                                                <button type="button" onClick={() => setNuevaVision('')} style={{ ...chip(false, f.color), background: 'transparent', border: `1px dashed ${C.outlineVariant}` }}>+ Nueva</button>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <input
                                                autoFocus value={nuevaVision} onChange={e => setNuevaVision(e.target.value)}
                                                placeholder="Ej. Que Boga sea la más grande"
                                                style={{ ...campo(movil), flex: 1, minWidth: 0, boxSizing: 'border-box', background: C.surfaceContainerLow }}
                                            />
                                            <button type="button" onClick={() => setNuevaVision(null)} title="Cancelar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', alignItems: 'center' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                                            </button>
                                        </div>
                                    )}
                                    <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: C.outline }}>El norte al que apunta: sin número ni fecha. Son tus Proyectos.</p>
                                </div>

                                <div>
                                    <div style={etiqueta}>Área</div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {AREAS.map(a => (
                                            <button type="button" key={a} onClick={() => set({ area: a })} style={chip(f.area === a, f.color)}>{a}</button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={etiqueta}>Ícono</div>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '260px' }}>
                                            {ICONOS.map(ic => (
                                                <button type="button" key={ic} onClick={() => set({ icon: ic })} style={{
                                                    width: '34px', height: '34px', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem',
                                                    border: f.icon === ic ? `2px solid ${f.color}` : `1px solid ${C.outlineVariant}`, background: C.surfaceLowest,
                                                }}>{ic}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={etiqueta}>Color</div>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '200px' }}>
                                            {COLORES.map(c => (
                                                <button type="button" key={c} onClick={() => set({ color: c })} style={{
                                                    width: '26px', height: '26px', borderRadius: '50%', cursor: 'pointer', background: c, padding: 0,
                                                    border: f.color === c ? `3px solid ${C.onSurface}` : '3px solid transparent',
                                                }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div style={etiqueta}>Fecha objetivo (opcional)</div>
                                    <input
                                        type="date" value={f.targetDate} onChange={e => set({ targetDate: e.target.value })}
                                        style={{ ...campo(movil), background: C.surfaceContainerLow, width: movil ? '100%' : 'auto', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" onClick={onClose} style={{
                                flex: 1, padding: '13px', borderRadius: '14px', border: `2px solid ${C.outlineVariant}`, background: C.surfaceLowest,
                                color: C.onSurfaceVariant, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
                            }}>Cancelar</button>
                            <button type="submit" disabled={!puede} style={{
                                flex: 2, padding: '13px', borderRadius: '14px', border: 'none', fontWeight: 800, fontSize: '0.85rem', fontFamily: 'inherit',
                                background: puede ? C.primary : C.surfaceContainerHigh, color: puede ? '#fff' : C.onSurfaceVariant,
                                cursor: puede ? 'pointer' : 'default',
                            }}>{editando ? 'Guardar cambios' : esSub ? 'Crear sub-meta' : 'Guardar meta'}</button>
                        </div>
                    </motion.form>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
