import { useState } from 'react';
import type { Project, TimeBlock, Routine, ProjectObjective, ProjectNode } from '../useAlDiaState';
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from '../useAlDiaState';

export const useProyectosState = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
    const [rutinas, setRutinas] = useState<Routine[]>([]);

    const reorderProjects = (newOrder: Project[]) => {
        setProjects(newOrder);
    };

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
        const pId = Number(projectId);
        const tId = Number(taskId);
        setProjects(prev => {
            if (!Array.isArray(prev)) return [];
            return prev.map(p => {
                if (Number(p.id) !== pId) return p;
                const currentChecklist = Array.isArray(p.checklist) ? p.checklist : [];
                const updatedChecklist = currentChecklist.map(t => {
                    if (Number(t.id) !== tId) return t;
                    const newCompleted = !t.completed;
                    // Sync linked routine item if exists
                    if (t.linkedRoutineId && t.linkedRoutineItemId) {
                        const lrId = Number(t.linkedRoutineId);
                        const lriId = Number(t.linkedRoutineItemId);
                        setRutinas(prevR => prevR.map(r => {
                            if (Number(r.id) !== lrId) return r;
                            return { ...r, items: r.items.map(it => Number(it.id) === lriId ? { ...it, completed: newCompleted } : it) };
                        }));
                    }
                    return { ...t, completed: newCompleted };
                });
                return { ...p, checklist: updatedChecklist };
            });
        });
    };

    const toggleRoutineItem = (routineId: number, itemId: number) => {
        const rId = Number(routineId);
        const iId = Number(itemId);
        setRutinas(prev => prev.map(r => {
            if (Number(r.id) !== rId) return r;
            return {
                ...r,
                items: r.items.map(it => {
                    if (Number(it.id) !== iId) return it;
                    const newCompleted = !it.completed;
                    const todayStr = new Date().toLocaleDateString('en-CA');
                    
                    // Sync linked project checklist if exists
                    if (it.linkedProjectId && it.linkedTaskId) {
                        const lpId = Number(it.linkedProjectId);
                        const ltId = Number(it.linkedTaskId);
                        setProjects(prevP => prevP.map(p => {
                            if (Number(p.id) !== lpId) return p;
                            return { ...p, checklist: (p.checklist || []).map(t => Number(t.id) === ltId ? { ...t, completed: newCompleted } : t) };
                        }));
                    }
                    
                    // Sync linked project node if exists
                    if (it.linkedProjectId && it.linkedObjectiveId) {
                        const lpId = Number(it.linkedProjectId);
                        const loId = Number(it.linkedObjectiveId);
                        setProjects(prevP => prevP.map(p => {
                            if (Number(p.id) !== lpId) return p;
                            return {
                                ...p,
                                objectives: (p.objectives || []).map(o => {
                                    if (Number(o.id) !== loId) return o;
                                    if (it.linkedNodeId) {
                                        const lnId = Number(it.linkedNodeId);
                                        return { ...o, nodes: (o.nodes || []).map(n => Number(n.id) === lnId ? { ...n, completed: newCompleted } : n) };
                                    } else {
                                        return { ...o, completed: newCompleted };
                                    }
                                })
                            };
                        }));
                    }
                    
                    return { ...it, completed: newCompleted, completedDate: newCompleted ? todayStr : undefined };
                })
            };
        }));
    };

    const promoteTaskToRoutine = (projectId: number, taskId: number, routineId: number) => {
        const project = projects.find(p => p.id === projectId);
        const task = project?.checklist?.find(t => t.id === taskId);
        
        if (task && task.text) {
            const newItemId = Date.now() + Math.random();
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

    const promoteNodeToRoutine = (projectId: number, objectiveId: number, nodeId: number | undefined, routineId: number) => {
        const project = projects.find(p => p.id === projectId);
        let text = '';
        let completed = false;

        if (nodeId) {
            const obj = project?.objectives?.find(o => o.id === objectiveId);
            const node = obj?.nodes?.find(n => n.id === nodeId);
            if (node) {
                text = node.title;
                completed = !!node.completed;
            }
        } else {
            const obj = project?.objectives?.find(o => o.id === objectiveId);
            if (obj) {
                text = obj.title;
                completed = !!obj.completed;
            }
        }

        if (text) {
            const newItemId = Date.now() + Math.random();
            setRutinas(prevRutinas => prevRutinas.map(r => {
                if (r.id !== routineId) return r;
                return {
                    ...r,
                    items: [...r.items, { 
                        id: newItemId, 
                        text, 
                        completed,
                        linkedProjectId: projectId,
                        linkedObjectiveId: objectiveId,
                        linkedNodeId: nodeId
                    }]
                };
            }));
            
            setProjects(prev => prev.map(p => {
                if (p.id !== projectId) return p;
                return {
                    ...p,
                    objectives: (p.objectives || []).map(o => {
                        if (o.id !== objectiveId) return o;
                        if (nodeId) {
                            return {
                                ...o,
                                nodes: (o.nodes || []).map(n => n.id === nodeId ? {
                                    ...n,
                                    linkedRoutineId: routineId,
                                    linkedRoutineItemId: newItemId
                                } : n)
                            };
                        } else {
                            return {
                                ...o,
                                linkedRoutineId: routineId,
                                linkedRoutineItemId: newItemId
                            };
                        }
                    })
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

    const updateTimeBlock = (id: number, updates: Partial<TimeBlock>) => {
        setTimeBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const addRoutineItem = (routineId: number, text: string, time?: string) => {
        setRutinas(prev => prev.map(r => {
            if (r.id !== routineId) return r;
            return {
                ...r,
                items: [...r.items, { id: Date.now() + Math.random(), text, completed: false, time, completedDate: undefined }]
            };
        }));
    };

    const updateRoutineItem = (routineId: number, itemId: number, updates: Partial<{
        text: string; completed: boolean; time: string;
        linkedProjectId: number | undefined; linkedTaskId: number | undefined;
        linkedObjectiveId: number | undefined; linkedNodeId: number | undefined;
    }>) => {
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

    // Promoción inversa: ítem de rutina → tarea del checklist de un proyecto
    const promoteRoutineItemToProject = (routineId: number, itemId: number, projectId: number) => {
        const rId = Number(routineId);
        const iId = Number(itemId);
        const pId = Number(projectId);

        const rutina = rutinas.find(r => Number(r.id) === rId);
        const item = rutina?.items.find(it => Number(it.id) === iId);
        
        if (!item) {
            console.warn("Promote fail: Item not found", { rId, iId, rutinas });
            return;
        }

        const newTaskId = Date.now() + Math.random();

        // 1. Añadir tarea al checklist del proyecto con el vínculo hacia la rutina
        setProjects(prev => prev.map(p => {
            if (Number(p.id) !== pId) return p;
            const newTask = {
                id: Date.now() + Math.random(),
                text: item.text,
                completed: item.completed,
                linkedRoutineId: rId,
                linkedRoutineItemId: iId
            };
            return { ...p, checklist: [...(p.checklist || []), newTask] };
        }));

        // 2. Marcar el ítem de rutina con el vínculo hacia la tarea del proyecto
        setRutinas(prev => prev.map(r => {
            if (Number(r.id) !== rId) return r;
            return {
                ...r,
                items: r.items.map(it => Number(it.id) === iId ? {
                    ...it,
                    linkedProjectId: pId,
                    linkedTaskId: newTaskId
                } : it)
            };
        }));
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
        updateTimeBlock,
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
        removeProjectNode,
        reorderProjectTasks: (projectId: number, newChecklist: { id: number; text: string; completed: boolean; linkedRoutineId?: number; linkedRoutineItemId?: number }[]) => {
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, checklist: newChecklist } : p));
        },
        promoteNodeToRoutine,
        addRoutine,
        removeRoutine,
        reorderRoutineItems,
        addProjectObjective,
        updateProjectObjective,
        removeProjectObjective,
        addProjectNode,
        updateProjectNode,
        reorderProjects,
        promoteRoutineItemToProject
    };
};
