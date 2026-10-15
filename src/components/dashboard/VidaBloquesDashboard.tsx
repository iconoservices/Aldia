import { useMemo, useState } from 'react';
import type { Habit, Routine, DailyBlock, UserPreferences } from '../../hooks/useAlDiaState';
import { VidaDashboard } from './VidaDashboard';
import { BloquesDashboard } from './BloquesDashboard';

/* ══════════════════════════════════════════════════════════════════
   VidaBloquesDashboard — "Vida" y "Bloques" eran dos pestañas separadas
   que tratan lo mismo (tu estructura recurrente: rutina semanal + hábitos
   y rutinas). Ahora viven en una sola pestaña con un conmutador arriba;
   por dentro sigue siendo cada dashboard tal cual, sin fusionar su código.
══════════════════════════════════════════════════════════════════ */

type VidaSub = 'rutina' | 'habitos' | 'horario';

interface VidaBloquesProps {
    // sub-pestaña inicial (según por qué ruta/URL llegó el usuario).
    // Se aceptan los alias antiguos 'bloques' (→ rutina) y 'vida' (→ habitos).
    initial?: VidaSub | 'bloques' | 'vida';
    // Dentro de Agenda la barra de vistas de arriba ya elige entre Rutina y Horario.
    ocultarSwitcher?: boolean;

    // ── Bloques ──
    dailyBlocks: DailyBlock[];
    addDailyBlock: (label: string, period: 'Mañana' | 'Tarde' | 'Noche' | 'Otro', date: string, completed?: boolean, projectId?: number, repeatDays?: number[]) => void;
    toggleDailyBlock: (id: number) => void;
    removeDailyBlock: (id: number | number[]) => void;
    updateDailyBlock: (id: number, updates: Partial<DailyBlock>) => void;
    preferences: UserPreferences;
    updatePreference: (key: keyof UserPreferences, value: any) => void;

    // ── Vida (hábitos + rutinas) ──
    habits: Habit[];
    toggleHabit: (id: number, dayIndex: number) => void;
    addHabit: (name: string, schedule?: number[], linkedRoutineId?: number, linkedRoutineItemId?: number) => void;
    removeHabit: (id: number) => void;
    rutinas: Routine[];
    addRoutineItem: (routineId: number, text: string) => void;
    toggleRoutineItem: (routineId: number, itemId: number) => void;
    removeRoutineItem: (routineId: number, itemId: number) => void;
    updateRoutine: (id: number, updates: Partial<Routine>) => void;
    updateRoutineItem: (routineId: number, itemId: number, updates: any) => void;
    addRoutine: (title: string) => void;
    removeRoutine: (id: number) => void;
    reorderRoutineItems: (routineId: number, newItems: any[]) => void;
    promoteRoutineItemToProject: (routineId: number, itemId: number, projectId: number) => void;

    // compartido
    projects: any[];
}

const normalizeSub = (v: VidaBloquesProps['initial']): VidaSub =>
    v === 'bloques' ? 'rutina' : v === 'vida' ? 'habitos' : (v ?? 'rutina');

export const VidaBloquesDashboard = (props: VidaBloquesProps) => {
    const [sub, setSub] = useState<VidaSub>(normalizeSub(props.initial));

    // Adaptador de días: las repetitivas guardan sus días como Date.getDay() (lunes = 1 … domingo = 0, como en
    // Tareas), pero la vista de Rutina piensa con lunes = 0. Acá se traduce de ida y de vuelta para no tocar
    // cada uso dentro de BloquesDashboard.
    const aLunes = (d: number) => (d + 6) % 7;
    const aGetDay = (i: number) => (i + 1) % 7;
    const bloquesLunes = useMemo(
        () => props.dailyBlocks.map(b => b.repeatDays ? { ...b, repeatDays: b.repeatDays.map(aLunes) } : b),
        [props.dailyBlocks]
    );
    const addDailyBlockLunes: VidaBloquesProps['addDailyBlock'] = (label, period, date, completed, projectId, repeatDays) =>
        props.addDailyBlock(label, period, date, completed, projectId, repeatDays?.map(aGetDay));
    const updateDailyBlockLunes: VidaBloquesProps['updateDailyBlock'] = (id, updates) =>
        props.updateDailyBlock(id, updates.repeatDays ? { ...updates, repeatDays: updates.repeatDays.map(aGetDay) } : updates);

    const tabBtn = (key: VidaSub): React.CSSProperties => ({
        flex: 1,
        padding: '9px 12px',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '0.78rem',
        fontWeight: 900,
        background: sub === key ? 'white' : 'transparent',
        color: sub === key ? 'var(--domain-orange)' : '#6C8079',
        boxShadow: sub === key ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    });

    return (
        <div>
            {!props.ocultarSwitcher && (
            <div style={{ display: 'flex', gap: '4px', background: '#F7FAF8', padding: '4px', borderRadius: '14px', maxWidth: '520px', margin: '0 auto 1.2rem', position: 'sticky', top: '8px', zIndex: 30 }}>
                <button onClick={() => setSub('rutina')} style={tabBtn('rutina')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>checklist</span>
                    Rutina
                </button>
                <button onClick={() => setSub('habitos')} style={tabBtn('habitos')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>spa</span>
                    Hábitos
                </button>
                <button onClick={() => setSub('horario')} style={tabBtn('horario')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>schedule</span>
                    Horario
                </button>
            </div>
            )}

            {sub === 'rutina' ? (
                <BloquesDashboard
                    dailyBlocks={bloquesLunes}
                    addDailyBlock={addDailyBlockLunes}
                    toggleDailyBlock={props.toggleDailyBlock}
                    removeDailyBlock={props.removeDailyBlock}
                    updateDailyBlock={updateDailyBlockLunes}
                    projects={props.projects}
                    preferences={props.preferences}
                    updatePreference={props.updatePreference}
                />
            ) : (
                <VidaDashboard
                    only={sub === 'horario' ? 'horario' : 'habitos'}
                    habits={props.habits}
                    toggleHabit={props.toggleHabit}
                    addHabit={props.addHabit}
                    removeHabit={props.removeHabit}
                    rutinas={props.rutinas}
                    addRoutineItem={props.addRoutineItem}
                    toggleRoutineItem={props.toggleRoutineItem}
                    removeRoutineItem={props.removeRoutineItem}
                    updateRoutine={props.updateRoutine}
                    updateRoutineItem={props.updateRoutineItem}
                    addRoutine={props.addRoutine}
                    removeRoutine={props.removeRoutine}
                    reorderRoutineItems={props.reorderRoutineItems}
                    projects={props.projects}
                    promoteRoutineItemToProject={props.promoteRoutineItemToProject}
                />
            )}
        </div>
    );
};
