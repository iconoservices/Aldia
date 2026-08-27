import { useState, useMemo } from 'react';
import type { Transaction, FixedExpense } from '../useAlDiaState';

export const useFinanzasState = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
    const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);

    const txArr = Array.isArray(transactions) ? transactions : [];
    const todayStr = new Date().toLocaleDateString('en-CA');

    // Balance DERIVADO (100% preciso, no necesita setBalance)
    const balance = useMemo(() => {
        return txArr
            .filter(t => !t?.isCashless)
            .reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);
    }, [txArr]);

    const addTransaction = (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean, category?: string, contact?: string, dueDate?: string) => {
        const value = Math.abs(amount);

        const newTx: Transaction = {
            id: Date.now() + Math.random(),
            text,
            amount: type === 'ingreso' ? value : -value,
            type,
            isDebt,
            isCashless,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: new Date().toLocaleDateString('en-CA'),
            projectId,
            accountId,
            category,
            contact,
            dueDate
        };
        setTransactions(prev => [newTx, ...prev]);
    };

    const repayDebt = (originalTx: Transaction, repayAmount: number, accountId: number) => {
        const value = Math.abs(repayAmount);
        
        // Determinar si era una deuda que YO DEBÍA o que ME DEBÍAN
        // Yo debo: (gasto sin efectivo) o (ingreso con efectivo inicial)
        // Me deben: (ingreso sin efectivo) o (gasto con efectivo inicial)
        const isOwe = (originalTx.type === 'gasto' && originalTx.isCashless) || 
                      (originalTx.type === 'ingreso' && !originalTx.isCashless);
        
        // Si yo debía, el pago es un GASTO (sale dinero de mi bolsillo)
        // Si me debían, el cobro es un INGRESO (entra dinero a mi bolsillo)
        const type = isOwe ? 'gasto' : 'ingreso';
        
        const repaymentTx: Transaction = {
            id: Date.now() + Math.random(),
            text: `Pago: ${originalTx.text}`,
            amount: type === 'ingreso' ? value : -value,
            type,
            isDebt: true, // Sigue perteneciendo al flujo de deudas para el cálculo neto
            isCashless: false, // El pago siempre es registrado como movimiento de efectivo real
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fullDate: new Date().toLocaleDateString('en-CA'),
            projectId: originalTx.projectId,
            accountId,
            category: originalTx.category,
            contact: originalTx.contact
        };
        setTransactions(prev => [repaymentTx, ...prev]);
    };

    const addFixedExpense = (text: string, amount: number, projectId?: number, dueDay?: number, accountId?: number) => {
        const newExpense: FixedExpense = { id: Date.now() + Math.random(), text, amount, active: true, projectId, dueDay, accountId };
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

    const markFixedExpensePaid = (id: number, monthStr: string, accountId?: number) => {
        const expense = fixedExpenses.find(e => e.id === id);
        if (!expense) return;

        // Si no se pasa cuenta explícita, usar la cuenta habitual del gasto fijo
        const resolvedAccountId = accountId ?? expense.accountId;

        // Si ya había un abono parcial este mes, solo se registra lo que falta
        const alreadyPaid = expense.partialPaid?.month === monthStr ? expense.partialPaid.amount : 0;
        const remaining = Math.max(0, expense.amount - alreadyPaid);

        // Update the paid status
        setFixedExpenses((prev: FixedExpense[]) => prev.map(e => e.id === id ? { ...e, lastPaidMonth: monthStr, partialPaid: undefined } : e));

        // Auto-generate the transaction if it's being marked as paid
        if (expense.lastPaidMonth !== monthStr && remaining > 0) {
            addTransaction(`Pago: ${expense.text}`, remaining, 'gasto', false, expense.projectId, resolvedAccountId, false, 'Servicios');
        }
    };

    // Abona una parte del gasto fijo. Si el abono cubre el total pendiente, queda como pagado.
    const payFixedExpensePartial = (id: number, monthStr: string, amount: number, accountId?: number) => {
        const expense = fixedExpenses.find(e => e.id === id);
        if (!expense) return;

        const resolvedAccountId = accountId ?? expense.accountId;
        const alreadyPaid = expense.partialPaid?.month === monthStr ? expense.partialPaid.amount : 0;
        const remaining = Math.max(0, expense.amount - alreadyPaid);
        const value = Math.min(Math.abs(amount), remaining);
        if (value <= 0) return;

        const totalPaid = alreadyPaid + value;
        const isFullyPaid = totalPaid >= expense.amount - 0.005;

        setFixedExpenses((prev: FixedExpense[]) => prev.map(e => e.id === id ? {
            ...e,
            lastPaidMonth: isFullyPaid ? monthStr : e.lastPaidMonth,
            partialPaid: isFullyPaid ? undefined : { month: monthStr, amount: totalPaid },
        } : e));

        addTransaction(`Pago: ${expense.text}`, value, 'gasto', false, expense.projectId, resolvedAccountId, false, 'Servicios');
    };

    const unmarkFixedExpensePaid = (id: number, monthStr: string) => {
        const expense = fixedExpenses.find(e => e.id === id);
        if (!expense) return;

        // Reset the paid status (borra también cualquier abono parcial del mes)
        setFixedExpenses((prev: FixedExpense[]) => prev.map(e => e.id === id ? { ...e, lastPaidMonth: undefined, partialPaid: undefined } : e));

        // Elimina todos los pagos/abonos generados para este gasto fijo en el mes
        setTransactions((prev: Transaction[]) => {
            const targetTxPrefix = `Pago: ${expense.text}`;
            return prev.filter(t => !(t.text === targetTxPrefix && t.fullDate.startsWith(monthStr)));
        });
    };

    // Métricas calculadas (DIARIAS)
    const todayIncome = txArr
        .filter(t => t?.type === 'ingreso' && !t.isCashless && t.fullDate === todayStr)
        .reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);

    const todayExpense = txArr
        .filter(t => t?.type === 'gasto' && !t.isCashless && t.fullDate === todayStr)
        .reduce((acc, t) => acc + Math.abs(Number(t?.amount) || 0), 0);

    const todayNet = todayIncome - todayExpense;

    // Ganancia Real Diaria (sin deudas)
    const todayIncomeReal = txArr
        .filter(t => t?.type === 'ingreso' && !t.isDebt && t.fullDate === todayStr)
        .reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);

    const todayExpenseReal = txArr
        .filter(t => t?.type === 'gasto' && !t.isDebt && t.fullDate === todayStr)
        .reduce((acc, t) => acc + Math.abs(Number(t?.amount) || 0), 0);

    // Totales Históricos (Para el Balance de "Tres Realidades")
    const totalIncomeReal = txArr
        .filter(t => t?.type === 'ingreso' && !t.isDebt)
        .reduce((acc, t) => acc + (Number(t?.amount) || 0), 0);

    const totalExpenseReal = txArr
        .filter(t => t?.type === 'gasto' && !t.isDebt)
        .reduce((acc, t) => acc + Math.abs(Number(t?.amount) || 0), 0);

    const totalNetReal = totalIncomeReal - totalExpenseReal;

    const debtsOwe = txArr
        .filter(t => t.isDebt && !t.text.startsWith('Pago: ') && t.type === 'gasto')
        .reduce((acc, t) => acc + Math.abs(Number(t?.amount) || 0), 0);

    const debtsOwed = txArr
        .filter(t => t.isDebt && !t.text.startsWith('Pago: ') && t.type === 'ingreso')
        .reduce((acc, t) => acc + Math.abs(Number(t?.amount) || 0), 0);

    const removeTransaction = (id: number) => {
        setTransactions((prev: Transaction[]) => prev.filter(t => t.id !== id));
    };

    const updateTransaction = (id: number, updates: Partial<Transaction>) => {
        setTransactions((prev: Transaction[]) => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const updateTransactionGroup = (oldText: string, oldContact: string | undefined, updates: { text?: string, contact?: string, amount?: number, accountId?: number, dueDate?: string }, originalId: number) => {
        setTransactions((prev: Transaction[]) => prev.map(t => {
            const isOriginal = t.id === originalId;
            const tTextBase = t.text.startsWith('Pago: ') ? t.text.replace('Pago: ', '') : t.text;
            const matchesGroup = tTextBase === oldText && t.contact === oldContact && t.isDebt;

            if (isOriginal) {
                return { ...t, ...updates };
            } else if (matchesGroup) {
                // Si es un pago/abono, actualizamos el texto (prefijo Pago:) y el contacto
                const newUpdates: Partial<Transaction> = {};
                if (updates.text) newUpdates.text = t.text.startsWith('Pago: ') ? `Pago: ${updates.text}` : updates.text;
                if (updates.contact !== undefined) newUpdates.contact = updates.contact;
                return { ...t, ...newUpdates };
            }
            return t;
        }));
    };

    return {
        transactions,
        setTransactions,
        balance,
        monthlyBudget,
        setMonthlyBudget,
        fixedExpenses,
        setFixedExpenses,
        addTransaction,
        removeTransaction,
        updateTransaction,
        updateTransactionGroup,
        addFixedExpense,
        removeFixedExpense,
        toggleFixedExpense,
        updateFixedExpense,
        markFixedExpensePaid,
        payFixedExpensePartial,
        unmarkFixedExpensePaid,
        repayDebt,
        todayIncome,
        todayExpense,
        todayNet,
        todayIncomeReal,
        todayExpenseReal,
        totalIncomeReal,
        totalExpenseReal,
        totalNetReal,
        debtsOwe,
        debtsOwed
    };
};
