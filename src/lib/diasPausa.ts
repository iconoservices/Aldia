// Gestión de días de pausa / descanso del usuario (persistencia local)
const STORAGE_KEY = 'aldia_dias_pausa';

export const getDiasPausa = (): string[] => {
    try {
        const val = localStorage.getItem(STORAGE_KEY);
        return val ? JSON.parse(val) : [];
    } catch {
        return [];
    }
};

export const esDiaPausa = (fechaStr: string): boolean => {
    const list = getDiasPausa();
    return list.includes(fechaStr);
};

export const toggleDiaPausa = (fechaStr: string): boolean => {
    try {
        const list = getDiasPausa();
        const exists = list.includes(fechaStr);
        const updated = exists ? list.filter(d => d !== fechaStr) : [...list, fechaStr];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('aldia_pausa_change', { detail: { fechaStr, isPausa: !exists } }));
        return !exists;
    } catch {
        return false;
    }
};
