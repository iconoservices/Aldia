import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C, RADIO, campo } from '../../theme';

/* Ventanita para crear una meta: título + sus tres plazos (en línea de tiempo)
   + detalles que se eligen tocando (área, ícono, color) y una fecha opcional. */

export const ICONOS = ['🎯', '💰', '🏠', '💻', '🌱', '❤️', '📚', '✈️', '🏆', '🛠️'];
export const COLORES = ['#0FA97A', '#4858ab', '#0E9F6E', '#B9760A', '#C77DFF', '#C63C3C', '#4D96FF', '#06D6A0'];
export const AREAS = ['Negocio', 'Finanzas', 'Salud', 'Personal', 'Aprendizaje', 'Familia'];

export interface NuevaMeta {
    title: string; area: string; icon: string; color: string; targetDate: string;
    corto: string[]; mediano: string[]; largo: string[];
}

const VACIA: NuevaMeta = { title: '', area: 'Personal', icon: ICONOS[0], color: COLORES[0], targetDate: '', corto: [], mediano: [], largo: [] };

const PLAZOS = [
    { k: 'corto', titulo: 'Corto plazo', sub: 'este mes' },
    { k: 'mediano', titulo: 'Mediano plazo', sub: 'próximos meses' },
    { k: 'largo', titulo: 'Largo plazo', sub: '1+ años' },
] as const;

const etiqueta: React.CSSProperties = {
    fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.outline, marginBottom: '8px',
};

interface Props {
    open: boolean;
    movil: boolean;
    onClose: () => void;
    onSave: (m: NuevaMeta) => void;
}

export const NuevaMetaModal = ({ open, movil, onClose, onSave }: Props) => {
    const [f, setF] = useState<NuevaMeta>(VACIA);
    const [borrador, setBorrador] = useState({ corto: '', mediano: '', largo: '' });

    useEffect(() => { if (open) { setF(VACIA); setBorrador({ corto: '', mediano: '', largo: '' }); } }, [open]);
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [open, onClose]);

    const puede = f.title.trim().length > 0;
    const agregar = (k: 'corto' | 'mediano' | 'largo') => {
        const t = borrador[k].trim();
        if (!t) return;
        setF(v => ({ ...v, [k]: [...v[k], t] }));
        setBorrador(b => ({ ...b, [k]: '' }));
    };
    const quitar = (k: 'corto' | 'mediano' | 'largo', i: number) => setF(v => ({ ...v, [k]: v[k].filter((_, j) => j !== i) }));
    const guardar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!puede) return;
        // lo escrito y no agregado con Enter tambien cuenta
        const con = (k: 'corto' | 'mediano' | 'largo') => borrador[k].trim() ? [...f[k], borrador[k].trim()] : f[k];
        onSave({ ...f, title: f.title.trim(), corto: con('corto'), mediano: con('mediano'), largo: con('largo') });
    };
    const set = (p: Partial<NuevaMeta>) => setF(v => ({ ...v, ...p }));

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
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
                            overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                            borderRadius: movil ? '24px 24px 0 0' : RADIO.modal, padding: movil ? '20px 18px 24px' : '24px',
                            display: 'flex', flexDirection: 'column', gap: '20px',
                        }}
                    >
                        {/* Cabecera: ícono elegido + título */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '16px', flexShrink: 0, fontSize: '1.5rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `${f.color}22`, border: `2px solid ${f.color}`,
                            }}>{f.icon}</div>
                            <input
                                autoFocus value={f.title} onChange={e => set({ title: e.target.value })}
                                placeholder="¿Qué quieres lograr?" enterKeyHint="done"
                                style={{
                                    flex: 1, minWidth: 0, border: 'none', borderBottom: `2px solid ${C.outlineVariant}`, outline: 'none',
                                    background: 'transparent', fontSize: '1.15rem', fontWeight: 700, color: C.onSurface,
                                    padding: '8px 0', fontFamily: 'inherit',
                                }}
                            />
                            <button type="button" onClick={onClose} title="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '4px' }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Línea de tiempo: corto → mediano → largo */}
                        <div>
                            <div style={etiqueta}>Cómo lo ves por plazo</div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {PLAZOS.map((pl, i) => (
                                    <div key={pl.k} style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '14px', flexShrink: 0 }}>
                                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: f.color, marginTop: '26px', flexShrink: 0 }} />
                                            {i < PLAZOS.length - 1 && <span style={{ flex: 1, width: '2px', background: `${f.color}55` }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, paddingBottom: i < PLAZOS.length - 1 ? '10px' : 0 }}>
                                            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: C.onSurface, margin: '6px 0 4px' }}>
                                                {pl.titulo} <span style={{ fontWeight: 500, color: C.outline }}>· {pl.sub}</span>
                                            </div>
                                            {f[pl.k].map((t, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
                                                    <span style={{ width: '16px', height: '16px', borderRadius: '5px', border: `2px solid ${C.outlineVariant}`, flexShrink: 0 }} />
                                                    <span style={{ flex: 1, fontSize: '0.85rem', color: C.onSurface, wordBreak: 'break-word' }}>{t}</span>
                                                    <button type="button" onClick={() => quitar(pl.k, idx)} title="Quitar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.outline, display: 'flex', padding: '2px' }}>
                                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                                                    </button>
                                                </div>
                                            ))}
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <input
                                                    value={borrador[pl.k]} onChange={e => setBorrador(b => ({ ...b, [pl.k]: e.target.value }))}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar(pl.k); } }}
                                                    placeholder="Agregar tarea y Enter" enterKeyHint="next"
                                                    style={{ ...campo(movil), flex: 1, minWidth: 0, boxSizing: 'border-box', background: C.surfaceContainerLow }}
                                                />
                                                <button type="button" onClick={() => agregar(pl.k)} disabled={!borrador[pl.k].trim()} title="Agregar" style={{
                                                    width: '40px', flexShrink: 0, border: 'none', borderRadius: RADIO.campo, cursor: 'pointer',
                                                    background: borrador[pl.k].trim() ? f.color : C.surfaceContainerHigh, color: '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Todo lo que se elige tocando */}
                        <div>
                            <div style={etiqueta}>Área</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {AREAS.map(a => (
                                    <button type="button" key={a} onClick={() => set({ area: a })} style={{
                                        border: 'none', borderRadius: RADIO.chip, padding: '8px 14px', cursor: 'pointer',
                                        fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit',
                                        background: f.area === a ? f.color : C.surfaceContainer,
                                        color: f.area === a ? '#fff' : C.onSurfaceVariant,
                                    }}>{a}</button>
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

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" onClick={onClose} style={{
                                flex: 1, padding: '13px', borderRadius: '14px', border: `2px solid ${C.outlineVariant}`, background: C.surfaceLowest,
                                color: C.onSurfaceVariant, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
                            }}>Cancelar</button>
                            <button type="submit" disabled={!puede} style={{
                                flex: 2, padding: '13px', borderRadius: '14px', border: 'none', fontWeight: 800, fontSize: '0.85rem', fontFamily: 'inherit',
                                background: puede ? C.primary : C.surfaceContainerHigh, color: puede ? '#fff' : C.onSurfaceVariant,
                                cursor: puede ? 'pointer' : 'default',
                            }}>Guardar meta</button>
                        </div>
                    </motion.form>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
