import { useState } from 'react';
import type { Transaction, FixedExpense } from '../useAlDiaState';

export const useFinanzasState = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [balance, setBalance] = useState(4250.00);
    const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
    const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);

    const addTransaction = (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projectId?: number) => {
        const value = Math.abs(amount);

        if (!isDebt) {
            setBalance(prev => type === 'ingreso' ? prev + value : prev - value);
        }

        const newTx: Transaction = {
            id: Date.now() + Math.random(),
            text,
            amount: type === 'ingreso' ? value : -value,
            type,
            isDebt,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: new Date().toISOString().split('T')[0],
            projectId
        };
        setTransactions(prev => [newTx, ...prev]);
    };

    const addFixedExpense = (text: string, amount: number, projectId?: number) => {
        const newExpense: FixedExpense = { id: Date.now() + Math.random(), text, amount, active: true, projectId };
        setFixedExpenses(prev => [...prev, newExpense]);
    };

    const removeFixedExpense = (id: number) => {
        setFixedExpenses(prev => prev.filter(e => e.id !== id));
    };

    const toggleFixedExpense = (id: number) => {
        setFixedExpenses(prev => prev.map(e => e.id === id ? { ...e, active: !e.active } : e));
    };

    const updateFixedExpense = (id: number, updates: Partial<FixedExpense>) => {
        setFixedExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    };

    // Métricas calculadas
    const todayStr = new Date().toISOString().split('T')[0];

    const todayIncome = transactions
        .filter(t => t.type === 'ingreso' && !t.isDebt && t.fullDate === todayStr)
        .reduce((acc, t) => acc + t.amount, 0);

    const todayExpense = transactions
        .filter(t => t.type === 'gasto' && !t.isDebt && t.fullDate === todayStr)
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const debtsOwe = transactions
        .filter(t => t.type === 'gasto' && t.isDebt)
        .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const debtsOwed = transactions
        .filter(t => t.type === 'ingreso' && t.isDebt)
        .reduce((acc, t) => acc + t.amount, 0);

    return {
        transactions,
        setTransactions,
        balance,
        setBalance,
        monthlyBudget,
        setMonthlyBudget,
        fixedExpenses,
        setFixedExpenses,
        addTransaction,
        addFixedExpense,
        removeFixedExpense,
        toggleFixedExpense,
        updateFixedExpense,
        todayIncome,
        todayExpense,
        debtsOwe,
        debtsOwed
    };
};
