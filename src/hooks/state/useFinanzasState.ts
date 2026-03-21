import { useState, useMemo } from 'react';
import type { Transaction, FixedExpense } from '../useAlDiaState';

export const useFinanzasState = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
    const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);

    const txArr = Array.isArray(transactions) ? transactions : [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Balance DERIVADO (100% preciso, no necesita setBalance)
    const balance = useMemo(() => {
        return txArr
            .filter(t => !t?.isCashless)
            .reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);
    }, [txArr]);

    const addTransaction = (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean) => {
        const value = Math.abs(amount);

        const newTx: Transaction = {
            id: Date.now() + Math.random(),
            text,
            amount: type === 'ingreso' ? value : -value,
            type,
            isDebt,
            isCashless,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: new Date().toISOString().split('T')[0],
            projectId,
            accountId
        };
        setTransactions(prev => [newTx, ...prev]);
    };

    const repayDebt = (originalTx: Transaction, repayAmount: number, accountId: number) => {
        const value = Math.abs(repayAmount);
        const type = originalTx.type === 'gasto' ? 'ingreso' : 'gasto'; // Reversa el tipo para pagar
        
        const repaymentTx: Transaction = {
            id: Date.now() + Math.random(),
            text: `Pago: ${originalTx.text}`,
            amount: type === 'ingreso' ? value : -value,
            type,
            isDebt: true, // Sigue siendo parte del flujo de deuda para el cálculo neto
            isCashless: false, // El pago siempre es con efectivo
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: new Date().toISOString().split('T')[0],
            projectId: originalTx.projectId,
            accountId
        };
        setTransactions(prev => [repaymentTx, ...prev]);
    };

    const addFixedExpense = (text: string, amount: number, projectId?: number) => {
        const newExpense: FixedExpense = { id: Date.now() + Math.random(), text, amount, active: true, projectId };
        setFixedExpenses(prev => [...prev, newExpense]);
    };

    const removeFixedExpense = (id: number) => {
        setFixedExpenses(prev => prev.filter(e => e.id !== id));
    };

    const toggleFixedExpense = (id: number) => {
        setFixedExpenses((prev: FixedExpense[]) => prev.map(e => e.id === id ? { ...e, active: !e.active } : e));
    };

    const updateFixedExpense = (id: number, updates: Partial<FixedExpense>) => {
        setFixedExpenses((prev: FixedExpense[]) => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    };

    // Métricas calculadas
    const todayIncome = txArr
        .filter(t => t?.type === 'ingreso' && !t.isDebt && t.fullDate === todayStr)
        .reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);

    const todayExpense = txArr
        .filter(t => t?.type === 'gasto' && !t.isDebt && t.fullDate === todayStr)
        .reduce((acc, t) => acc + Math.abs(Number(t?.amount) || 0), 0);

    const debtsOwe = txArr
        .filter(t => t.isDebt && ((t.type === 'gasto' && t.isCashless) || (t.type === 'ingreso' && !t.isCashless)))
        .reduce((acc, t) => acc + Math.abs(Number(t?.amount) || 0), 0);

    const debtsOwed = txArr
        .filter(t => t.isDebt && ((t.type === 'ingreso' && t.isCashless) || (t.type === 'gasto' && !t.isCashless)))
        .reduce((acc, t) => acc + Math.abs(Number(t?.amount) || 0), 0);

    return {
        transactions,
        setTransactions,
        balance,
        // setBalance se quita de aquí porque es derivado
        monthlyBudget,
        setMonthlyBudget,
        fixedExpenses,
        setFixedExpenses,
        addTransaction,
        addFixedExpense,
        removeFixedExpense,
        toggleFixedExpense,
        updateFixedExpense,
        repayDebt,
        todayIncome,
        todayExpense,
        debtsOwe,
        debtsOwed
    };
};
