/* ══════════════════════════════════════════════════════════════════
   Plantillas de finanzas

   Estructura base de grupos + categorías para una cuenta. La idea: al
   crear una cuenta nueva (otra persona, otro negocio) se aplica una
   plantilla y queda armada toda la contabilidad de un toque, en vez de
   rehacer los grupos a mano cada vez.

   La plantilla NO se edita desde la app. Cada cuenta puede agregar sus
   propias categorías encima — esas se respetan y no son parte de la
   plantilla. Aplicar una plantilla sólo SUMA lo que falte: nunca borra
   ni mueve una categoría que ya está en un grupo.

   Los transversales (Gastos Fijos, Deudas, Transferencia) no van en
   ninguna plantilla: ya son globales a todas las cuentas.
══════════════════════════════════════════════════════════════════ */

export type PlantillaId = 'personal' | 'negocio';

export interface PlantillaDef {
    id: PlantillaId;
    label: string;
    /** grupo → categorías dentro de ese grupo, por tipo de movimiento */
    grupos: {
        gasto: Record<string, string[]>;
        ingreso: Record<string, string[]>;
    };
}

export const PLANTILLAS: Record<PlantillaId, PlantillaDef> = {
    personal: {
        id: 'personal',
        label: 'Personal',
        grupos: {
            gasto: {
                'Esencial': ['Comida', 'Transporte', 'Servicios', 'Salud'],
                'Gustos': ['Antojos', 'Golosinas', 'Ocio', 'Detalles'],
                'Familia': [],
            },
            ingreso: {
                'Ingresos': ['Trabajo', 'Ayuda', 'Extras'],
            },
        },
    },
    negocio: {
        id: 'negocio',
        label: 'Negocio',
        grupos: {
            gasto: {
                'Costo directo': ['Colaboradores', 'Materiales de entrega', 'Insumos'],
                'Fijo operativo': ['Publicidad', 'Software'],
                'Inversión': ['Equipo'],
            },
            ingreso: {
                'Ventas': ['Ventas / servicios'],
            },
        },
    },
};

export const PLANTILLA_IDS = Object.keys(PLANTILLAS) as PlantillaId[];
