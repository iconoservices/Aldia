import { useState } from 'react';
import type { Project, TimeBlock, Routine, ProjectObjective, ProjectNode } from '../useAlDiaState';
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from '../useAlDiaState';

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

    const reorderRoutineItems = (routineId: number, newItems: any[]) => {
        setRutinas(prev => prev.map(r => r.id === routineId ? { ...r, items: newItems } : r));
    };

    const addProjectCategory = (projectId: number, type: 'ingreso' | 'gasto', categoryName: string) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            const key = type === 'ingreso' ? 'incomeCategories' : 'expenseCategories';
            const defaults = type === 'ingreso' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
            const currentList = p[key] ?? defaults;
            if (currentList.includes(categoryName)) return p;
            return { ...p, [key]: [...currentList, categoryName] };
        }));
    };

    const removeProjectCategory = (projectId: number, type: 'ingreso' | 'gasto', categoryName: string) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            const key = type === 'ingreso' ? 'incomeCategories' : 'expenseCategories';
            const defaults = type === 'ingreso' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
            const currentList = p[key] ?? defaults;
            return { ...p, [key]: currentList.filter(c => c !== categoryName) };
        }));
    };

    // --- NUEVO SISTEMA (Objetivos y Nodos) ---
    const addProjectObjective = (projectId: number, title: string) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            const newObj: ProjectObjective = { id: Date.now() + Math.random(), title, completed: false, nodes: [] };
            return { ...p, objectives: [...(p.objectives || []), newObj] };
        }));
    };

    const updateProjectObjective = (projectId: number, objectiveId: number, updates: Partial<ProjectObjective>) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                objectives: (p.objectives || []).map(o => o.id === objectiveId ? { ...o, ...updates } : o)
            };
        }));
    };

    const removeProjectObjective = (projectId: number, objectiveId: number) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, objectives: (p.objectives || []).filter(o => o.id !== objectiveId) };
        }));
    };

    const addProjectNode = (projectId: number, objectiveId: number, title: string, type: 'task' | 'note' | 'checklist') => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                objectives: (p.objectives || []).map(o => {
                    if (o.id !== objectiveId) return o;
                    const newNode: ProjectNode = { id: Date.now() + Math.random(), type, title, completed: false, subItems: [] };
                    return { ...o, nodes: [...(o.nodes || []), newNode] };
                })
            };
        }));
    };

    const updateProjectNode = (projectId: number, objectiveId: number, nodeId: number, updates: Partial<ProjectNode>) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                objectives: (p.objectives || []).map(o => {
                    if (o.id !== objectiveId) return o;
                    return { ...o, nodes: (o.nodes || []).map(n => n.id === nodeId ? { ...n, ...updates } : n) };
                })
            };
        }));
    };

    const removeProjectNode = (projectId: number, objectiveId: number, nodeId: number) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                objectives: (p.objectives || []).map(o => {
                    if (o.id !== objectiveId) return o;
                    return { ...o, nodes: (o.nodes || []).filter(n => n.id !== nodeId) };
                })
            };
        }));
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
        addProjectCategory,
        removeProjectCategory,
        reorderProjectTasks: (projectId: number, newChecklist: { id: number; text: string; completed: boolean; linkedRoutineId?: number; linkedRoutineItemId?: number }[]) => {
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, checklist: newChecklist } : p));
        },
        addRoutine,
        removeRoutine,
        reorderRoutineItems,
        addProjectObjective,
        updateProjectObjective,
        removeProjectObjective,
        addProjectNode,
        updateProjectNode,
        removeProjectNode
    };
};
