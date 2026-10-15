// Formato compacto para guardar las tareas de Mi Día (dailyBlocks).
//
// En memoria todo sigue siendo DailyBlock[] (ChecklistDiario, hábitos, Resumen y
// Tareas no cambian). Solo al guardar (Firestore y localStorage) se agrupan los
// bloques en series que comparten todo salvo id, fecha y hecho: una plantilla por
// serie y una marca corta por bloque. Es sin pérdida: expandir(compactar(x)) da los
// mismos bloques, en el mismo orden y con los mismos ids.
//
// Marca: `<día><*|.><Δid>` en base 36. día = días desde 2026-01-01 (puede ser
// negativo), * = hecho, . = pendiente, Δid = id menos el id del bloque anterior de
// la serie (los bloques se crean en tandas con ids consecutivos, así que casi
// siempre es "1"). Un bloque que no encaja (id no entero, fecha rara…) se guarda
// tal cual como serie de un solo bloque (`r`).
//
// Orden: `o` lista, en el orden original, qué serie aporta cada bloque, comprimido
// por tramos: "3" = un bloque de la serie 3, "3x5" = cinco seguidos (base 36).

import type { DailyBlock } from '../hooks/useAlDiaState';

export const FORMATO_BLOQUES = 1;

interface Serie { p?: Record<string, unknown>; m?: string; r?: DailyBlock }
export interface BloquesCompactos { f: number; s: Serie[]; o: string }

const EPOCA = Date.UTC(2026, 0, 1);
const DIA = 86400000;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const aDia = (fecha: string) => Math.round((Date.parse(fecha + 'T00:00:00Z') - EPOCA) / DIA);
const deDia = (n: number) => new Date(EPOCA + n * DIA).toISOString().slice(0, 10);

const esCompacto = (v: unknown): v is BloquesCompactos =>
    !!v && typeof v === 'object' && !Array.isArray(v) && (v as any).f === FORMATO_BLOQUES;

export const compactarBloques = (bloques: DailyBlock[]): BloquesCompactos => {
    const series: Serie[] = [];
    const porClave = new Map<string, number>();
    const ultimoId: number[] = [];
    const marcas: string[][] = [];
    const orden: number[] = [];

    for (const original of bloques) {
        // Semántica JSON: lo undefined no se guarda en ningún lado.
        const b = JSON.parse(JSON.stringify(original)) as DailyBlock;
        const { id, date, completed, ...resto } = b;
        const encaja = Number.isSafeInteger(id) && typeof completed === 'boolean'
            && typeof date === 'string' && FECHA.test(date) && deDia(aDia(date)) === date;
        if (!encaja) {
            orden.push(series.length);
            series.push({ r: b });
            continue;
        }
        const plantilla = Object.fromEntries(Object.keys(resto).sort().map(k => [k, (resto as any)[k]]));
        const clave = JSON.stringify(plantilla);
        let i = porClave.get(clave);
        if (i === undefined) {
            i = series.length;
            porClave.set(clave, i);
            series.push({ p: plantilla });
            ultimoId[i] = 0;
            marcas[i] = [];
        }
        marcas[i].push(`${aDia(date).toString(36)}${completed ? '*' : '.'}${(id - ultimoId[i]).toString(36)}`);
        ultimoId[i] = id;
        orden.push(i);
    }
    marcas.forEach((m, i) => { if (m) series[i].m = m.join(' '); });

    const tramos: string[] = [];
    for (let j = 0; j < orden.length;) {
        let k = j;
        while (k < orden.length && orden[k] === orden[j]) k++;
        const n = k - j;
        tramos.push(n === 1 ? orden[j].toString(36) : `${orden[j].toString(36)}x${n.toString(36)}`);
        j = k;
    }
    return { f: FORMATO_BLOQUES, s: series, o: tramos.join(' ') };
};

// Acepta el formato compacto o el arreglo de siempre. Lanza error si el compacto
// viene dañado: quien llama decide no aplicarlo (nunca vaciar la lista por eso).
export const expandirBloques = (v: unknown): DailyBlock[] => {
    if (Array.isArray(v)) return v as DailyBlock[];
    if (!esCompacto(v)) throw new Error('dailyBlocks: formato desconocido');

    const colas = v.s.map((s): DailyBlock[] => {
        if (s.r) return [s.r];
        let id = 0;
        return (s.m ? s.m.split(' ') : []).map(tok => {
            const m = /^(-?[0-9a-z]+)([*.])(-?[0-9a-z]+)$/.exec(tok);
            if (!m) throw new Error(`dailyBlocks: marca inválida "${tok}"`);
            id += parseInt(m[3], 36);
            return { id, ...(s.p as object), date: deDia(parseInt(m[1], 36)), completed: m[2] === '*' } as DailyBlock;
        });
    });

    const pos = new Array(colas.length).fill(0);
    const out: DailyBlock[] = [];
    for (const tramo of v.o ? v.o.split(' ') : []) {
        const [a, b] = tramo.split('x');
        const i = parseInt(a, 36);
        const n = b === undefined ? 1 : parseInt(b, 36);
        for (let k = 0; k < n; k++) {
            const bloque = colas[i]?.[pos[i]++];
            if (!bloque) throw new Error('dailyBlocks: orden inconsistente');
            out.push(bloque);
        }
    }
    if (colas.some((c, i) => pos[i] !== c.length)) throw new Error('dailyBlocks: sobran marcas');
    return out;
};
