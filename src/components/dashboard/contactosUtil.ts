// Normaliza un nombre para compararlo: sin tildes, minúsculas, espacios colapsados.
export const norm = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const distancia = (a: string, b: string) => {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++)
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[a.length][b.length];
};

// ¿Dos nombres distintos probablemente son la misma persona? ("Ferrxxo" ~ "Ferxxo", "Carlos" ~ "Carlos M.")
export const parecidos = (a: string, b: string) => {
    const x = norm(a), y = norm(b);
    if (!x || !y || x === y) return false;
    if (Math.min(x.length, y.length) >= 4 && (x.includes(y) || y.includes(x))) return true;
    const tope = Math.max(x.length, y.length) >= 7 ? 2 : 1;
    return Math.min(x.length, y.length) >= 3 && distancia(x, y) <= tope;
};

export const iniciales = (s: string) =>
    s.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
