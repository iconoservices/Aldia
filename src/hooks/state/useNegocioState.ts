import { useState } from 'react';

export interface NegocioClient {
    id: number;
    name: string;
    monthlyPayment: number;
    myEarning: number;
}

export interface NegocioWorker {
    id: number;
    name: string;
    role: string;
    monthlySalary: number;
}

export interface NegocioExpense {
    id: number;
    text: string;
    amount: number;
}

export interface NegocioProject {
    id: number;
    name: string;
    color: string;
    clients: NegocioClient[];
    workers: NegocioWorker[];
    expenses: NegocioExpense[];
}

export const useNegocioState = () => {
    const [negocioProjects, setNegocioProjects] = useState<NegocioProject[]>([]);

    const addNegocioProject = (name: string, color: string) => {
        const newProject: NegocioProject = {
            id: Date.now(),
            name,
            color,
            clients: [],
            workers: [],
            expenses: []
        };
        setNegocioProjects(prev => [...prev, newProject]);
    };

    const removeNegocioProject = (id: number) => {
        setNegocioProjects(prev => prev.filter(p => p.id !== id));
    };

    const updateNegocioProject = (id: number, updates: Partial<NegocioProject>) => {
        setNegocioProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const addClient = (projectId: number, name: string, monthlyPayment: number, myEarning: number) => {
        setNegocioProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                clients: [...p.clients, { id: Date.now() + Math.random(), name, monthlyPayment, myEarning }]
            };
        }));
    };

    const updateClient = (projectId: number, clientId: number, updates: Partial<NegocioClient>) => {
        setNegocioProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                clients: p.clients.map(c => c.id === clientId ? { ...c, ...updates } : c)
            };
        }));
    };

    const removeClient = (projectId: number, clientId: number) => {
        setNegocioProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, clients: p.clients.filter(c => c.id !== clientId) };
        }));
    };

    const addWorker = (projectId: number, name: string, role: string, monthlySalary: number) => {
        setNegocioProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                workers: [...p.workers, { id: Date.now() + Math.random(), name, role, monthlySalary }]
            };
        }));
    };

    const updateWorker = (projectId: number, workerId: number, updates: Partial<NegocioWorker>) => {
        setNegocioProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                workers: p.workers.map(w => w.id === workerId ? { ...w, ...updates } : w)
            };
        }));
    };

    const removeWorker = (projectId: number, workerId: number) => {
        setNegocioProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, workers: p.workers.filter(w => w.id !== workerId) };
        }));
    };

    const addExpense = (projectId: number, text: string, amount: number) => {
        setNegocioProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                expenses: [...p.expenses, { id: Date.now() + Math.random(), text, amount }]
            };
        }));
    };

    const updateExpense = (projectId: number, expenseId: number, updates: Partial<NegocioExpense>) => {
        setNegocioProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                expenses: p.expenses.map(e => e.id === expenseId ? { ...e, ...updates } : e)
            };
        }));
    };

    const removeExpense = (projectId: number, expenseId: number) => {
        setNegocioProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, expenses: p.expenses.filter(e => e.id !== expenseId) };
        }));
    };

    return {
        negocioProjects, setNegocioProjects,
        addNegocioProject, removeNegocioProject, updateNegocioProject,
        addClient, updateClient, removeClient,
        addWorker, updateWorker, removeWorker,
        addExpense, updateExpense, removeExpense
    };
};
