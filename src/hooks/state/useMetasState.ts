import { useState } from 'react';
import type { Goal, GoalHorizon } from '../useAlDiaState';

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
            milestones: [],
            projectId,
            order: goals.length,
        };
        setGoals(prev => [newGoal, ...prev]);
    };

    const updateGoal = (id: number, updates: Partial<Goal>) => {
        setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    };

    const removeGoal = (id: number) => {
        setGoals(prev => prev.filter(g => g.id !== id));
    };

    const reorderGoals = (newOrder: Goal[]) => {
        setGoals(newOrder);
    };

    const addGoalMilestone = (goalId: number, text: string) => {
        setGoals(prev => prev.map(g => {
            if (g.id !== goalId) return g;
            return { ...g, milestones: [...g.milestones, { id: Date.now() + Math.random(), text, completed: false }] };
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
