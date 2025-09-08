import { supabase } from '../database.js';

// --- Helper Functions ---
function getNegocioId() {
    const id = document.body.dataset.negocioId;
    if (!id) {
        console.error('Error crítico: Atributo data-negocio-id no encontrado en el body.');
        alert('Error de configuración: No se pudo identificar el negocio.');
    }
    return id;
}

function ymdLocal(date) {
    const d = date ? new Date(date) : new Date();
    // Adjust for timezone offset to get the correct local date string
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}

// --- DOM Elements ---
const negocioId = getNegocioId();
const fechaSelector = document.getElementById('fecha-selector');
const tablaCitas = document.getElementById('tablaCitas');

// --- State ---
let selectedDate = ymdLocal(new Date());

// --- Data Fetching & Actions ---
async function cargarDatos(fecha) {
    if (!negocioId) return;

    try {
        const { data, error } = await supabase
            .from('citas')
            .select('*')
            .eq('negocio_id', negocioId)
            .eq('fecha', fecha)
            .order('hora_inicio', { ascending: true });

        if (error) throw error;

        const citasDelDia = data || [];
        actualizarContadores(citasDelDia);
        actualizarTablaCitas(citasDelDia);

    } catch (err) {
        console.error('Error al cargar datos de citas:', err);
        tablaCitas.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-red-500">Error al cargar las citas.</td></tr>`;
    }
}

async function cambiarEstadoCita(citaId, nuevoEstado) {
    const { error } = await supabase
        .from('citas')
        .update({ estado: nuevoEstado })
        .eq('id', citaId);

    if (error) {
        console.error(`Error al cambiar estado a ${nuevoEstado}:`, error);
        alert(`No se pudo actualizar la cita. ${error.message}`);
    }
    // The real-time subscription will trigger a refresh
}

// --- UI Updates ---
function actualizarContadores(citas) {
    const programadas = citas.filter(c => c.estado === 'programada').length;
    const completadas = citas.filter(c => c.estado === 'completada').length;

    document.getElementById('citasProgramadas').textContent = programadas;
    document.getElementById('citasCompletadas').textContent = completadas;
    document.getElementById('citasHoy').textContent = citas.length;
}

function getEstadoClass(estado) {
    switch (estado) {
        case 'programada': return 'text-blue-500';
        case 'completada': return 'text-green-500';
        case 'cancelada': return 'text-red-500 line-through';
        default: return 'text-gray-500';
    }
}

function actualizarTablaCitas(citas) {
    if (!tablaCitas) return;

    if (citas.length === 0) {
        tablaCitas.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-gray-500">No hay citas para esta fecha.</td></tr>`;
        return;
    }

    tablaCitas.innerHTML = citas.map(cita => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="py-2 px-4 border-b dark:border-gray-700 font-mono">${cita.hora_inicio.substring(0, 5)}</td>
            <td class="py-2 px-4 border-b dark:border-gray-700">${cita.nombre || 'N/A'}</td>
            <td class="py-2 px-4 border-b dark:border-gray-700">${cita.servicio || 'N/A'}</td>
            <td class="py-2 px-4 border-b dark:border-gray-700">
                <span class="${getEstadoClass(cita.estado)} font-bold">${cita.estado}</span>
            </td>
            <td class="py-2 px-4 border-b dark:border-gray-700 space-x-2">
                ${cita.estado === 'programada' ? `
                <button data-id="${cita.id}" data-action="complete" class="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded">Completar</button>
                <button data-id="${cita.id}" data-action="cancel" class="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded">Cancelar</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}


// --- Event Handlers & Subscriptions ---
function handleCitaAction(event) {
    const button = event.target.closest('button[data-id]');
    if (!button) return;

    const citaId = button.dataset.id;
    const action = button.dataset.action;

    if (action === 'complete') {
        if (confirm('¿Marcar esta cita como completada?')) {
            cambiarEstadoCita(citaId, 'completada');
        }
    } else if (action === 'cancel') {
        if (confirm('¿Cancelar esta cita?')) {
            cambiarEstadoCita(citaId, 'cancelada');
        }
    }
}

function suscribirseCitas() {
    if (!negocioId) return;

    const channel = supabase
        .channel(`citas-negocio-${negocioId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'citas',
            filter: `negocio_id=eq.${negocioId}`,
        },
        payload => {
            // Check if the change affects the currently viewed date
            const changedDate = payload.new.fecha || payload.old.fecha;
            if (changedDate === selectedDate) {
                console.log('🟢 Actualización de citas en tiempo real:', payload.new.id);
                cargarDatos(selectedDate);
            }
        }
        )
        .subscribe();

    return channel;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (!negocioId) return;

    fechaSelector.value = selectedDate;
    cargarDatos(selectedDate);
    suscribirseCitas();

    fechaSelector.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        cargarDatos(selectedDate);
    });

    tablaCitas.addEventListener('click', handleCitaAction);
});
