import { useState } from 'react';
import type { Mission, Habit, CalendarEvent } from '../useAlDiaState';

export const useMisionesState = () => {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [agenda, setAgenda] = useState<CalendarEvent[]>([]);

    const toggleMission = (id: number) => {
        setMissions(prev => {
            const mission = prev.find(m => m.id === id);
            if (!mission) return prev;

            const isCompleting = !mission.completed;
            let updated = prev.map(m => m.id === id ? { ...m, completed: isCompleting } : m);

            if (isCompleting && mission.repeat !== 'none') {
                let nextDate = mission.dueDate ? new Date(mission.dueDate + 'T12:00:00') : new Date();
                
                if (mission.repeat === 'daily') {
                    nextDate.setDate(nextDate.getDate() + 1);
                } else if (mission.repeat === 'weekly') {
                    nextDate.setDate(nextDate.getDate() + 7);
                } else if (mission.repeat === 'monthly') {
                    nextDate.setMonth(nextDate.getMonth() + 1);
                }

                const newInstance: Mission = {
                    ...mission,
                    id: Date.now() + Math.random(),
                    completed: false,
                    dueDate: nextDate.toLocaleDateString('en-CA')
                };
                updated = [newInstance, ...updated];
            }

            return updated;
        });
    };

    const updateMission = (id: number, updates: Partial<Mission>) => {
        setMissions(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    };

    const removeMission = (id: number) => {
        setMissions(prev => prev.filter(m => m.id != id));
    };

    const addMission = (text: string, q: string = 'Q2', repeat: 'none' | 'daily' | 'weekly' | 'monthly' = 'none', noteId?: number, labels: string[] = [], dueDate?: string, dueTime?: string, habitId?: number, projectId?: number, repeatDays?: number[]) => {
        const newMission: Mission = {
            id: Date.now() + Math.random(),
            text,
            q,
            critical: q === 'Q1',
            completed: false,
            repeat,
            noteId,
            labels,
            dueDate: dueDate || new Date().toLocaleDateString('en-CA'),
            dueTime,
            habitId,
            projectId,
            repeatDays
        };
        setMissions(prev => [newMission, ...prev]);
    };

    const toggleHabit = (habitId: number, dayIndex: number) => {
        setHabits(prev => prev.map(h => {
            if (h.id !== habitId) return h;
            const alreadyCompleted = h.completedDays.includes(dayIndex);
            return {
                ...h,
                completedDays: alreadyCompleted
                    ? h.completedDays.filter(d => d !== dayIndex)
                    : [...h.completedDays, dayIndex]
            };
        }));
    };

    const addHabit = (name: string) => {
        const newHabit: Habit = {
            id: Date.now() + Math.random(),
            name,
            completedDays: []
        };
        setHabits(prev => [newHabit, ...prev]);
    };

    const removeHabit = (id: number) => {
        setHabits(prev => prev.filter(h => h.id !== id));
    };

    const addCalendarEvent = (title: string, date: string, startTime: string, endTime: string, description: string, projectId?: number) => {
        const newEvent: CalendarEvent = {
            id: Date.now() + Math.random(),
            title,
            date,
            startTime,
            endTime,
            description,
            projectId
        };
        setAgenda(prev => [...prev, newEvent].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.startTime.localeCompare(b.startTime);
        }));
    };

    const removeCalendarEvent = (id: number) => {
        setAgenda(prev => prev.filter(e => e.id !== id));
    };

    const updateCalendarEvent = (id: number, updates: Partial<CalendarEvent>) => {
        setAgenda(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    };

    // Métricas calculadas (DEFENSIVAS)
    const completedMissionsCount = Array.isArray(missions) ? missions.filter(m => m?.completed).length : 0;
    const totalMissionsCount = Array.isArray(missions) ? missions.length : 0;
    const missionFocusScore = totalMissionsCount > 0 ? (completedMissionsCount / totalMissionsCount) * 100 : 0;

    const habitPerformance = (Array.isArray(habits) && habits.length > 0)
        ? (habits.reduce((acc, h) => acc + (Array.isArray(h?.completedDays) ? h.completedDays.length : 0), 0) / (habits.length * 7)) * 100
        : 0;

    const performanceScore = (missionFocusScore + habitPerformance) / 2;

    return {
        missions,
        setMissions,
        habits,
        setHabits,
        agenda,
        setAgenda,
        toggleMission,
        updateMission,
        removeMission,
        addMission,
        toggleHabit,
        addHabit,
        removeHabit,
        addCalendarEvent,
        removeCalendarEvent,
        updateCalendarEvent,
        reorderMissions: (newMissions: Mission[]) => {
            setMissions(prev => {
                // 1. Extraer solo las misiones base (sin rutinas/hábitos) en su nuevo orden
                const reorderedStandalone = newMissions.filter(m => !m.isRoutine && !m.isHabit);
                const reorderedIds = new Set(reorderedStandalone.map(m => m.id));
                
                // 2. Conservar las misiones que no estaban en esta vista (ej. futuras)
                const futureOrOtherMissions = prev.filter(m => !reorderedIds.has(m.id) && !m.isRoutine && !m.isHabit);
                
                // 3. Unir respetando el nuevo orden para las de hoy
                return [...reorderedStandalone, ...futureOrOtherMissions];
            });
        },
        performanceScore,
        missionFocusScore,
        completedMissionsCount
    };
};
