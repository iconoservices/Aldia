import { useState } from 'react';
import type { Habit, Routine, DailyBlock, UserPreferences } from '../../hooks/useAlDiaState';
import { VidaDashboard } from './VidaDashboard';
import { BloquesDashboard } from './BloquesDashboard';

/* ══════════════════════════════════════════════════════════════════
   VidaBloquesDashboard — "Vida" y "Bloques" eran dos pestañas separadas
   que tratan lo mismo (tu estructura recurrente: rutina semanal + hábitos
   y rutinas). Ahora viven en una sola pestaña con un conmutador arriba;
   por dentro sigue siendo cada dashboard tal cual, sin fusionar su código.
══════════════════════════════════════════════════════════════════ */

interface VidaBloquesProps {
    // sub-pestaña inicial (según por qué ruta/URL llegó el usuario)
    initial?: 'bloques' | 'vida';

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

export const VidaBloquesDashboard = (props: VidaBloquesProps) => {
    const [sub, setSub] = useState<'bloques' | 'vida'>(props.initial ?? 'bloques');

    const tabBtn = (key: 'bloques' | 'vida'): React.CSSProperties => ({
        flex: 1,
        padding: '9px 12px',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '0.78rem',
        fontWeight: 900,
        background: sub === key ? 'white' : 'transparent',
        color: sub === key ? 'var(--domain-orange)' : '#94A3B8',
        boxShadow: sub === key ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    });

    return (
        <div>
            <div style={{ display: 'flex', gap: '4px', background: '#F1F5F9', padding: '4px', borderRadius: '14px', maxWidth: '460px', margin: '0 auto 1.2rem', position: 'sticky', top: '8px', zIndex: 30 }}>
                <button onClick={() => setSub('bloques')} style={tabBtn('bloques')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history_edu</span>
                    Rutina semanal
                </button>
                <button onClick={() => setSub('vida')} style={tabBtn('vida')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>spa</span>
                    Hábitos y rutinas
                </button>
            </div>

            {sub === 'bloques' ? (
                <BloquesDashboard
                    dailyBlocks={props.dailyBlocks}
                    addDailyBlock={props.addDailyBlock}
                    toggleDailyBlock={props.toggleDailyBlock}
                    removeDailyBlock={props.removeDailyBlock}
                    updateDailyBlock={props.updateDailyBlock}
                    projects={props.projects}
                    preferences={props.preferences}
                    updatePreference={props.updatePreference}
                />
            ) : (
                <VidaDashboard
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
