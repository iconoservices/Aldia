import { useState, useMemo } from 'react';
import { getPeriodKey, addPeriod, type Transaction, type FixedExpense } from '../useAlDiaState';

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

    const addTransaction = (text: string, amount: number, type: 'ingreso' | 'gasto', isDebt: boolean, projectId?: number, accountId?: number, isCashless?: boolean, category?: string, contact?: string, dueDate?: string, notes?: string) => {
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
            dueDate,
            notes
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

    const addFixedExpense = (text: string, amount: number, projectId?: number, dueDay?: number, accountId?: number, frequency?: 'monthly' | 'weekly', dueWeekday?: number, contact?: string, totalAmount?: number) => {
        const newExpense: FixedExpense = { id: Date.now() + Math.random(), text, amount, active: true, projectId, dueDay, accountId, frequency, dueWeekday, contact, totalAmount, paidToDate: totalAmount ? 0 : undefined };
        setFixedExpenses(prev => [...prev, newExpense]);
    };

    // Si el gasto fijo es un préstamo a plazos (tiene totalAmount), suma lo pagado en
    // esta cuota al acumulado y lo desactiva solo cuando ya cubrió el tope — así deja
    // de pedirse cada período sin que haya que borrarlo a mano.
    const applyInstallmentProgress = (expense: FixedExpense, paidValue: number): Partial<FixedExpense> => {
        if (expense.totalAmount == null) return {};
        const paidToDate = (expense.paidToDate ?? 0) + paidValue;
        return { paidToDate, active: paidToDate >= expense.totalAmount - 0.005 ? false : expense.active };
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
        const isNewPayment = expense.lastPaidMonth !== monthStr && remaining > 0;

        // Update the paid status
        setFixedExpenses((prev: FixedExpense[]) => prev.map(e => e.id === id ? {
            ...e, lastPaidMonth: monthStr, partialPaid: undefined,
            ...(isNewPayment ? applyInstallmentProgress(e, remaining) : {}),
        } : e));

        // Auto-generate the transaction if it's being marked as paid
        if (isNewPayment) {
            addTransaction(`Pago: ${expense.text}`, remaining, 'gasto', false, expense.projectId, resolvedAccountId, false, 'Gastos Fijos', expense.contact);
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
            ...applyInstallmentProgress(e, value),
        } : e));

        addTransaction(`Pago: ${expense.text}`, value, 'gasto', false, expense.projectId, resolvedAccountId, false, 'Gastos Fijos', expense.contact);
    };

    // Detecta gastos fijos que cruzaron a un período nuevo (mes/semana) sin quedar saldados
    // y mueve lo que faltaba a `pendingPeriods`, cada uno marcado con su propio período,
    // en vez de sumarlo al total del mes en curso.
    const rolloverFixedExpenses = () => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        setFixedExpenses((prev: FixedExpense[]) => prev.map(expense => {
            const frequency = expense.frequency;
            const currentPeriod = getPeriodKey(frequency, todayStr);
            let trackedDate = expense.currentPeriodStart ?? todayStr;
            let trackedPeriod = getPeriodKey(frequency, trackedDate);

            if (trackedPeriod === currentPeriod) {
                return expense.currentPeriodStart ? expense : { ...expense, currentPeriodStart: todayStr };
            }

            const newPending = [...(expense.pendingPeriods ?? [])];
            let partialPaid = expense.partialPaid;
            let guard = 0;
            while (trackedPeriod !== currentPeriod && guard < 104) {
                const wasFullyPaid = expense.lastPaidMonth === trackedPeriod;
                if (!wasFullyPaid) {
                    const amountPaid = partialPaid?.month === trackedPeriod ? partialPaid.amount : 0;
                    newPending.push({ period: trackedPeriod, amountPaid });
                }
                partialPaid = undefined;
                trackedDate = addPeriod(trackedDate, frequency);
                trackedPeriod = getPeriodKey(frequency, trackedDate);
                guard++;
            }

            return { ...expense, pendingPeriods: newPending, partialPaid, currentPeriodStart: todayStr };
        }));
    };

    // Abona (total o parcial) un período anterior que quedó pendiente. Si el abono lo cubre
    // por completo, ese período desaparece de la lista de pendientes.
    const payPendingPeriod = (id: number, period: string, amount: number, accountId?: number) => {
        const expense = fixedExpenses.find(e => e.id === id);
        if (!expense) return;
        const entry = expense.pendingPeriods?.find(p => p.period === period);
        if (!entry) return;

        const resolvedAccountId = accountId ?? expense.accountId;
        const remaining = Math.max(0, expense.amount - entry.amountPaid);
        const value = Math.min(Math.abs(amount), remaining);
        if (value <= 0) return;

        const totalPaid = entry.amountPaid + value;
        const isFullySettled = totalPaid >= expense.amount - 0.005;

        setFixedExpenses((prev: FixedExpense[]) => prev.map(e => e.id === id ? {
            ...e,
            pendingPeriods: isFullySettled
                ? (e.pendingPeriods ?? []).filter(p => p.period !== period)
                : (e.pendingPeriods ?? []).map(p => p.period === period ? { ...p, amountPaid: totalPaid } : p),
            ...applyInstallmentProgress(e, value),
        } : e));

        addTransaction(`Pago: ${expense.text} (${period})`, value, 'gasto', false, expense.projectId, resolvedAccountId, false, 'Gastos Fijos', expense.contact);
    };

    // Deshace todos los abonos hechos a un período pendiente específico (vuelve a quedar en 0).
    const unmarkPendingPeriod = (id: number, period: string) => {
        const expense = fixedExpenses.find(e => e.id === id);
        if (!expense) return;

        const entry = expense.pendingPeriods?.find(p => p.period === period);
        const removedAmount = entry?.amountPaid ?? 0;

        setFixedExpenses((prev: FixedExpense[]) => prev.map(e => e.id === id ? {
            ...e,
            pendingPeriods: (e.pendingPeriods ?? []).map(p => p.period === period ? { ...p, amountPaid: 0 } : p),
            ...(e.totalAmount != null ? { paidToDate: Math.max(0, (e.paidToDate ?? 0) - removedAmount), active: true } : {}),
        } : e));

        setTransactions((prev: Transaction[]) => {
            const targetTxText = `Pago: ${expense.text} (${period})`;
            return prev.filter(t => t.text !== targetTxText);
        });
    };

    const unmarkFixedExpensePaid = (id: number, monthStr: string) => {
        const expense = fixedExpenses.find(e => e.id === id);
        if (!expense) return;

        const targetTxPrefix = `Pago: ${expense.text}`;
        const removedAmount = txArr
            .filter(t => t.text === targetTxPrefix && getPeriodKey(expense.frequency, t.fullDate) === monthStr)
            .reduce((s, t) => s + Math.abs(t.amount), 0);

        // Reset the paid status (borra también cualquier abono parcial del período)
        setFixedExpenses((prev: FixedExpense[]) => prev.map(e => e.id === id ? {
            ...e, lastPaidMonth: undefined, partialPaid: undefined,
            ...(e.totalAmount != null ? { paidToDate: Math.max(0, (e.paidToDate ?? 0) - removedAmount), active: true } : {}),
        } : e));

        // Elimina todos los pagos/abonos generados para este gasto fijo en el período
        // (mensual: por prefijo "YYYY-MM"; semanal: por semana ISO calculada de la fecha real)
        setTransactions((prev: Transaction[]) => {
            return prev.filter(t => !(t.text === targetTxPrefix && getPeriodKey(expense.frequency, t.fullDate) === monthStr));
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
        rolloverFixedExpenses,
        payPendingPeriod,
        unmarkPendingPeriod,
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
