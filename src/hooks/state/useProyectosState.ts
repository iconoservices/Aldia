import { useState } from 'react';
import type { Project, TimeBlock, Routine } from '../useAlDiaState';

export const useProyectosState = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
    const [rutinas, setRutinas] = useState<Routine[]>([]);

    const addProject = (name: string, color: string, targetHoursPerWeek?: number) => {
        const newProject: Project = { 
            id: Date.now() + Math.random(), 
            name, 
            color, 
            status: 'activo',
            targetHoursPerWeek,
            checklist: [],
            inventoryItems: []
        };
        setProjects(prev => [newProject, ...prev]);
    };

    const addInventoryItem = (projectId: number, text: string, initialQuantity: number = 0) => {
        setProjects(prev => {
            if (!Array.isArray(prev)) return [];
            return prev.map(p => {
                if (p.id !== projectId) return p;
                const newItem = { id: Date.now() + Math.random(), text, quantity: initialQuantity };
                const currentInventory = Array.isArray(p.inventoryItems) ? p.inventoryItems : [];
                return { ...p, inventoryItems: [...currentInventory, newItem] };
            });
        });
    };

    const updateInventoryItemQuantity = (projectId: number, itemId: number, delta: number) => {
        setProjects(prev => {
            if (!Array.isArray(prev)) return [];
            return prev.map(p => {
                if (p.id !== projectId) return p;
                const currentInventory = Array.isArray(p.inventoryItems) ? p.inventoryItems : [];
                return {
                    ...p,
                    inventoryItems: currentInventory.map(i => i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
                };
            });
        });
    };

    const removeInventoryItem = (projectId: number, itemId: number) => {
        setProjects(prev => {
            if (!Array.isArray(prev)) return [];
            return prev.map(p => {
                if (p.id !== projectId) return p;
                const currentInventory = Array.isArray(p.inventoryItems) ? p.inventoryItems : [];
                return {
                    ...p,
                    inventoryItems: currentInventory.filter(i => i.id !== itemId)
                };
            });
        });
    };

    const addProjectTask = (projectId: number, text: string) => {
        setProjects(prev => {
            if (!Array.isArray(prev)) return [];
            return prev.map(p => {
                if (p.id !== projectId) return p;
                const newTask = { id: Date.now() + Math.random(), text, completed: false };
                const currentChecklist = Array.isArray(p.checklist) ? p.checklist : [];
                return { ...p, checklist: [...currentChecklist, newTask] };
            });
        });
    };

    const toggleProjectTask = (projectId: number, taskId: number) => {
        setProjects(prev => {
            if (!Array.isArray(prev)) return [];
            return prev.map(p => {
                if (p.id !== projectId) return p;
                const currentChecklist = Array.isArray(p.checklist) ? p.checklist : [];
                const updatedChecklist = currentChecklist.map(t => {
                    if (t.id !== taskId) return t;
                    const newCompleted = !t.completed;
                    // Sync linked routine item if exists
                    if (t.linkedRoutineId && t.linkedRoutineItemId) {
                        setRutinas(prevR => prevR.map(r => {
                            if (r.id !== t.linkedRoutineId) return r;
                            return { ...r, items: r.items.map(it => it.id === t.linkedRoutineItemId ? { ...it, completed: newCompleted } : it) };
                        }));
                    }
                    return { ...t, completed: newCompleted };
                });
                return { ...p, checklist: updatedChecklist };
            });
        });
    };

    const toggleRoutineItem = (routineId: number, itemId: number) => {
        setRutinas(prev => prev.map(r => {
            if (r.id !== routineId) return r;
            return {
                ...r,
                items: r.items.map(it => {
                    if (it.id !== itemId) return it;
                    const newCompleted = !it.completed;
                    // Sync linked project task if exists
                    if (it.linkedProjectId && it.linkedTaskId) {
                        setProjects(prevP => prevP.map(p => {
                            if (p.id !== it.linkedProjectId) return p;
                            return { ...p, checklist: (p.checklist || []).map(t => t.id === it.linkedTaskId ? { ...t, completed: newCompleted } : t) };
                        }));
                    }
                    return { ...it, completed: newCompleted };
                })
            };
        }));
    };

    const promoteTaskToRoutine = (projectId: number, taskId: number, routineId: number) => {
        const project = projects.find(p => p.id === projectId);
        const task = project?.checklist?.find(t => t.id === taskId);
        
        if (task && task.text) {
            const newItemId = Date.now() + Math.random();
            // Add to routine with link back to project task
            setRutinas(prevRutinas => prevRutinas.map(r => {
                if (r.id !== routineId) return r;
                return {
                    ...r,
                    items: [...r.items, { 
                        id: newItemId, 
                        text: task.text, 
                        completed: task.completed,
                        linkedProjectId: projectId,
                        linkedTaskId: taskId
                    }]
                };
            }));
            // Update project task with link to routine item
            setProjects(prev => prev.map(p => {
                if (p.id !== projectId) return p;
                return {
                    ...p,
                    checklist: (p.checklist || []).map(t => t.id === taskId ? {
                        ...t,
                        linkedRoutineId: routineId,
                        linkedRoutineItemId: newItemId
                    } : t)
                };
            }));
        }
    };

    const removeProjectTask = (projectId: number, taskId: number) => {
        setProjects(prev => {
            if (!Array.isArray(prev)) return [];
            return prev.map(p => {
                if (p.id !== projectId) return p;
                const currentChecklist = Array.isArray(p.checklist) ? p.checklist : [];
                return {
                    ...p,
                    checklist: currentChecklist.filter(t => t.id !== taskId)
                };
            });
        });
    };

    const updateProjectTask = (projectId: number, taskId: number, updates: Partial<{ text: string, completed: boolean }>) => {
        setProjects(prev => {
            if (!Array.isArray(prev)) return [];
            return prev.map(p => {
                if (p.id !== projectId) return p;
                const currentChecklist = Array.isArray(p.checklist) ? p.checklist : [];
                return {
                    ...p,
                    checklist: currentChecklist.map(t => t.id === taskId ? { ...t, ...updates } : t)
                };
            });
        });
    };


    const updateProject = (id: number, updates: Partial<Project>) => {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const deleteProject = (id: number) => {
        setProjects(prev => prev.filter(p => p.id !== id));
    };

    const addTimeBlock = (label: string, start: string, end: string, color: string, projectId?: number) => {
        const newBlock: TimeBlock = { id: Date.now(), label, start, end, color, projectId };
        setTimeBlocks(prev => [...prev, newBlock].sort((a,b) => a.start.localeCompare(b.start)));
    };

    const removeTimeBlock = (id: number) => {
        setTimeBlocks(prev => prev.filter(b => b.id !== id));
    };

    const addRoutineItem = (routineId: number, text: string, time?: string) => {
        setRutinas(prev => prev.map(r => {
            if (r.id !== routineId) return r;
            return {
                ...r,
                items: [...r.items, { id: Date.now() + Math.random(), text, completed: false, time }]
            };
        }));
    };

    const updateRoutineItem = (routineId: number, itemId: number, updates: Partial<{ text: string, completed: boolean, time: string }>) => {
        setRutinas(prev => prev.map(r => {
            if (r.id !== routineId) return r;
            return {
                ...r,
                items: r.items.map(it => it.id === itemId ? { ...it, ...updates } : it)
            };
        }));
    };


    const removeRoutineItem = (routineId: number, itemId: number) => {
        setRutinas(prev => prev.map(r => {
            if (r.id !== routineId) return r;
            return {
                ...r,
                items: r.items.filter(it => it.id !== itemId)
            };
        }));
    };

    const updateRoutine = (id: number, updates: Partial<Routine>) => {
        setRutinas(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    const addRoutine = (title: string, color: string = '#8a5cf6') => {
        setRutinas(prev => [...prev, {
            id: Date.now(),
            title,
            color,
            isActive: true,
            repeatDays: [0,1,2,3,4,5,6],
            startTime: '09:00',
            endTime: '10:00',
            items: []
        }]);
    };

    const removeRoutine = (id: number) => {
        setRutinas(prev => prev.filter(r => r.id !== id));
    };

    return {
        projects,
        setProjects,
        timeBlocks,
        setTimeBlocks,
        rutinas,
        setRutinas,
        addProject,
        addProjectTask,
        toggleProjectTask,
        removeProjectTask,
        promoteTaskToRoutine,
        updateProject,
        deleteProject,
        addTimeBlock,
        removeTimeBlock,
        addInventoryItem,
        updateInventoryItemQuantity,
        removeInventoryItem,
        addRoutineItem,
        updateRoutineItem,
        toggleRoutineItem,
        removeRoutineItem,
        updateRoutine,
        updateProjectTask,
        reorderProjectTasks: (projectId: number, newChecklist: { id: number; text: string; completed: boolean; linkedRoutineId?: number; linkedRoutineItemId?: number }[]) => {
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, checklist: newChecklist } : p));
        },
        addRoutine,
        removeRoutine
    };
};
