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

   Cada categoría trae una `desc` corta ("para qué sirve") que se siembra
   como descripción por defecto — el usuario la puede editar después desde
   Finanzas → Categorías.

   Los transversales (Gastos Fijos, Deudas, Transferencia) no van en
   ninguna plantilla: ya son globales a todas las cuentas.
══════════════════════════════════════════════════════════════════ */

export type PlantillaId = 'personal' | 'negocio';

/** Una categoría de plantilla: nombre + para qué sirve. */
export interface PlantillaCat {
    nombre: string;
    desc: string;
}

export interface PlantillaDef {
    id: PlantillaId;
    label: string;
    /** grupo → categorías dentro de ese grupo, por tipo de movimiento */
    grupos: {
        gasto: Record<string, PlantillaCat[]>;
        ingreso: Record<string, PlantillaCat[]>;
    };
}

export const PLANTILLAS: Record<PlantillaId, PlantillaDef> = {
    personal: {
        id: 'personal',
        label: 'Personal',
        grupos: {
            gasto: {
                'Esencial': [
                    { nombre: 'Comida', desc: 'Mercado, almuerzos, lo de comer del día a día.' },
                    { nombre: 'Transporte', desc: 'Pasajes, mototaxi, combustible, apps de viaje.' },
                    { nombre: 'Servicios', desc: 'Luz, agua, internet, plan del celular.' },
                    { nombre: 'Salud', desc: 'Farmacia, consultas, exámenes.' },
                ],
                'Gustos': [
                    { nombre: 'Antojos', desc: 'Comida fuera por gusto: alitas, delivery, snacks.' },
                    { nombre: 'Golosinas', desc: 'Dulces, gaseosas, chucherías.' },
                    { nombre: 'Ocio', desc: 'Salidas, cine, juegos, hobbies.' },
                    { nombre: 'Detalles', desc: 'Regalos y gestos para otras personas.' },
                ],
                'Familia': [],
            },
            ingreso: {
                'Ingresos': [
                    { nombre: 'Trabajo', desc: 'Sueldo o pago por trabajos que haces.' },
                    { nombre: 'Ayuda', desc: 'Plata que te da la familia u otros para apoyarte.' },
                    { nombre: 'Extras', desc: 'Ingresos sueltos: devoluciones, vender cosas, etc.' },
                ],
            },
        },
    },
    negocio: {
        id: 'negocio',
        label: 'Negocio',
        grupos: {
            gasto: {
                'Costo directo': [
                    { nombre: 'Colaboradores', desc: 'Pagos a quien te ayuda en un trabajo puntual.' },
                    { nombre: 'Materiales de entrega', desc: 'USB, portarretratos, empaque que va al cliente.' },
                    { nombre: 'Insumos', desc: 'Material que se consume al producir el trabajo.' },
                ],
                'Fijo operativo': [
                    { nombre: 'Publicidad', desc: 'Anuncios, promociones, pauta en redes.' },
                    { nombre: 'Software', desc: 'Suscripciones de herramientas: Adobe, IA, edición.' },
                ],
                'Inversión': [
                    { nombre: 'Equipo', desc: 'Compra de cámara, lentes, discos, accesorios.' },
                ],
            },
            ingreso: {
                'Ventas': [
                    { nombre: 'Ventas / servicios', desc: 'Lo que cobras por sesiones, marketing u otros servicios.' },
                ],
            },
        },
    },
};

export const PLANTILLA_IDS = Object.keys(PLANTILLAS) as PlantillaId[];
