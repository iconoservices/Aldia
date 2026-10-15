import { useState } from 'react';
import type { Goal, GoalHorizon, GoalMilestone } from '../useAlDiaState';

const ES_SUBMETA = /^\s*🎯\s*/;

// Migración única (idempotente): antes las sub-metas se anotaban como tareas que
// empezaban con '🎯' dentro de una columna de plazo. Cada una pasa a ser una
// sub-meta real (parentId) y se lleva las tareas que tenía debajo en esa columna.
// El id de la sub-meta = id de la tarea original, así dos dispositivos que migran
// a la vez producen exactamente lo mismo. Devuelve null si no hay nada que hacer.
export const migrarMetas = (goals: Goal[]): Goal[] | null => {
    if (!goals.some(g => !g.migradoV2)) return null;
    const nuevas: Goal[] = [];
    const out = goals.map(g => {
        if (g.migradoV2) return g;
        if (g.parentId) return { ...g, migradoV2: true };
        const sueltas: GoalMilestone[] = [];
        const porPlazo: Record<GoalHorizon, Goal | null> = { corto: null, mediano: null, largo: null };
        for (const m of g.milestones || []) {
            const plazo = m.plazo ?? 'corto';
            if (ES_SUBMETA.test(m.text)) {
                const sub: Goal = {
                    id: m.id, title: m.text.replace(ES_SUBMETA, '').trim() || m.text, horizon: plazo,
                    area: g.area, icon: '🎯', color: g.color, milestones: [], order: nuevas.length,
                    status: m.completed ? 'completado' : 'pendiente', parentId: g.id, migradoV2: true,
                };
                if (!goals.some(x => x.id === sub.id)) nuevas.push(sub);
                porPlazo[plazo] = sub;
            } else if (porPlazo[plazo]) {
                porPlazo[plazo]!.milestones.push(m);
            } else {
                sueltas.push(m);
            }
        }
        return { ...g, milestones: sueltas, migradoV2: true };
    });
    return [...out, ...nuevas];
};

export const useMetasState = () => {
    const [goals, setGoals] = useState<Goal[]>([]);

    const addGoal = (
        title: string,
        horizon: GoalHorizon,
        area: string,
        color: string,
        icon: string = '🎯',
        targetDate?: string,
        projectId?: number,
        milestones: GoalMilestone[] = [],
        nombresPlazo?: Goal['nombresPlazo'],
        extra: Partial<Goal> = {},
    ) => {
        const newGoal: Goal = {
            id: Date.now() + Math.random(),
            title,
            horizon,
            area,
            color,
            icon,
            status: 'pendiente',
            targetDate,
            milestones,
            nombresPlazo,
            projectId,
            order: goals.length,
            migradoV2: true,
            ...extra,
        };
        setGoals(prev => [newGoal, ...prev]);
    };

    const updateGoal = (id: number, updates: Partial<Goal>) => {
        setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    };

    // Borrar una meta borra también sus sub-metas.
    const removeGoal = (id: number) => {
        setGoals(prev => prev.filter(g => g.id !== id && g.parentId !== id));
    };

    const reorderGoals = (newOrder: Goal[]) => {
        setGoals(newOrder);
    };

    const addGoalMilestone = (goalId: number, text: string, plazo: GoalHorizon = 'corto') => {
        setGoals(prev => prev.map(g => {
            if (g.id !== goalId) return g;
            return { ...g, milestones: [...g.milestones, { id: Date.now() + Math.random(), text, completed: false, plazo }] };
        }));
    };

    const toggleGoalMilestone = (goalId: number, milestoneId: number) => {
        setGoals(prev => prev.map(g => {
            if (g.id !== goalId) return g;
            return { ...g, milestones: g.milestones.map(m => m.id === milestoneId ? { ...m, completed: !m.completed } : m) };
        }));
    };

    const removeGoalMilestone = (goalId: number, milestoneId: number) => {
        setGoals(prev => prev.map(g => {
            if (g.id !== goalId) return g;
            return { ...g, milestones: g.milestones.filter(m => m.id !== milestoneId) };
        }));
    };

    return {
        goals, setGoals,
        addGoal, updateGoal, removeGoal, reorderGoals,
        addGoalMilestone, toggleGoalMilestone, removeGoalMilestone,
    };
};
