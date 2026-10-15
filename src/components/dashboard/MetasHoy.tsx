import { useState } from 'react';
import type { DailyBlock, Goal } from '../../hooks/useAlDiaState';
import { C, MONO, bento } from '../../theme';
import { avance, subMetaActiva } from './metasAvance';

/* Mi Día: el escalón activo de cada meta (la primera sub-meta sin lograr, o la
   meta misma si no tiene sub-metas pero sí número) con su avance. Tocar abre Metas. */
export const MetasHoy = ({ goals, dailyBlocks, onOpenMetas }: { goals: Goal[]; dailyBlocks: DailyBlock[]; onOpenMetas?: () => void }) => {
    const [abierto, setAbierto] = useState(true);
    const filas = goals
        .filter(m => !m.parentId && m.status !== 'completado')
        .map(meta => {
            const sub = subMetaActiva(meta, goals);
            const foco = sub ?? (meta.objetivo ? meta : undefined);
            if (!foco) return null;
            const av = avance(foco, sub ? [] : goals.filter(g => g.parentId === meta.id), dailyBlocks);
            return { meta, foco, av };
        })
        .filter(Boolean) as { meta: Goal; foco: Goal; av: { pct: number; texto: string } }[];
    if (filas.length === 0) return null;

    return (
        <div style={{ ...bento, padding: '0.5rem 0.85rem' }}>
            <button
                onClick={() => setAbierto(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', fontFamily: 'inherit', color: C.onSurface }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.primary }}>flag</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Metas</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, background: 'rgba(15, 169, 122,0.10)', color: C.primary, borderRadius: '999px', padding: '1px 8px' }}>{filas.length}</span>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: C.outline, marginLeft: 'auto', transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>expand_more</span>
            </button>
            {abierto && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0 6px' }}>
                    {filas.map(({ meta, foco, av }) => (
                        <button
                            key={meta.id} onClick={onOpenMetas} title="Abrir en Metas"
                            style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', background: 'none', border: 'none', padding: 0, cursor: onOpenMetas ? 'pointer' : 'default', fontFamily: 'inherit', textAlign: 'left' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', width: '100%', minWidth: 0 }}>
                                <span style={{ fontSize: '0.83rem', fontWeight: 700, color: C.onSurface, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    🎯 {foco.title}
                                </span>
                                {av.texto && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.onSurfaceVariant, fontFamily: MONO, whiteSpace: 'nowrap' }}>{av.texto}</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <div style={{ flex: 1, height: '4px', background: C.surfaceContainerHigh, borderRadius: '999px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${av.pct}%`, background: meta.color, borderRadius: '999px' }} />
                                </div>
                                {foco !== meta && (
                                    <span style={{ fontSize: '0.66rem', color: C.outline, maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.icon} {meta.title}</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
