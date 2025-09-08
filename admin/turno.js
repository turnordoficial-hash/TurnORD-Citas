import { supabase } from '../database.js';

/**
 * Obtiene el ID del negocio desde el atributo `data-negocio-id` en el body.
 */
function getNegocioId() {
    const id = document.body.dataset.negocioId;
    if (!id) {
        console.error('Error crítico: Atributo data-negocio-id no encontrado en el body.');
        alert('Error de configuración: No se pudo identificar el negocio.');
    }
    return id;
}

const negocioId = getNegocioId();
let calendar; // Variable to hold the FullCalendar instance

document.addEventListener('DOMContentLoaded', async () => {
    if (!negocioId) return;

    const calendarEl = document.getElementById('calendar');
    const modal = document.getElementById('details-modal');
    const closeModalButton = document.getElementById('close-modal-button');

    if (!calendarEl || !modal || !closeModalButton) {
        console.error('No se encontraron los elementos necesarios para el calendario o el modal.');
        return;
    }

    // Fetch appointments and initialize the calendar
    const appointments = await fetchAppointments();
    initializeCalendar(calendarEl, appointments);

    // Setup modal close button
    closeModalButton.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
        // Close if clicking on the background overlay
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Listen for real-time changes
    subscribeToChanges();
});

/**
 * Fetches all appointments from Supabase for the current business.
 * @returns {Promise<Array>} A promise that resolves to an array of appointments.
 */
async function fetchAppointments() {
    try {
        const { data, error } = await supabase
            .from('citas')
            .select('fecha, hora_inicio, nombre, servicio')
            .eq('negocio_id', negocioId);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching appointments:', error.message);
        return [];
    }
}

/**
 * Initializes the FullCalendar instance.
 * @param {HTMLElement} calendarEl The element to render the calendar in.
 * @param {Array} appointments The initial list of appointments.
 */
function initializeCalendar(calendarEl, appointments) {
    const events = appointments.map(apt => ({
        title: `${apt.hora_inicio.substring(0, 5)} - ${apt.nombre}`,
        start: `${apt.fecha}T${apt.hora_inicio}`,
        extendedProps: {
            servicio: apt.servicio
        }
    }));

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        locale: 'es', // Set locale to Spanish
        dateClick: async function(info) {
            await handleDateClick(info.dateStr);
        },
        eventClick: async function(info) {
            await handleDateClick(info.event.startStr.split('T')[0]);
        }
    });

    calendar.render();
}

/**
 * Handles the click event on a date in the calendar.
 * @param {string} dateStr The date string (e.g., '2024-12-25').
 */
async function handleDateClick(dateStr) {
    const modal = document.getElementById('details-modal');
    const modalDateEl = document.getElementById('modal-date');
    const appointmentsListEl = document.getElementById('modal-appointments-list');

    // Fetch appointments just for this day to ensure data is fresh
    const appointments = await fetchAppointmentsForDay(dateStr);

    modalDateEl.textContent = new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    if (appointments.length === 0) {
        appointmentsListEl.innerHTML = '<p class="text-gray-500">No hay citas para este día.</p>';
    } else {
        appointmentsListEl.innerHTML = appointments
            .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
            .map(apt => `
                <div class="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <p class="font-bold text-gray-800 dark:text-gray-200">${apt.hora_inicio.substring(0, 5)} - ${apt.nombre}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Servicio: ${apt.servicio}</p>
                </div>
            `).join('');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

/**
 * Fetches appointments for a specific day.
 * @param {string} dateStr The date to fetch appointments for.
 * @returns {Promise<Array>}
 */
async function fetchAppointmentsForDay(dateStr) {
     try {
        const { data, error } = await supabase
            .from('citas')
            .select('fecha, hora_inicio, nombre, servicio')
            .eq('negocio_id', negocioId)
            .eq('fecha', dateStr);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error(`Error fetching appointments for ${dateStr}:`, error.message);
        return [];
    }
}

/**
 * Subscribes to real-time changes in the 'citas' table.
 */
function subscribeToChanges() {
    supabase
        .channel(`citas-admin-${negocioId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'citas',
            filter: `negocio_id=eq.${negocioId}`
        },
        async (payload) => {
            console.log('Change received!', payload);
            // Refetch all events and re-render the calendar
            const appointments = await fetchAppointments();
            const events = appointments.map(apt => ({
                title: `${apt.hora_inicio.substring(0, 5)} - ${apt.nombre}`,
                start: `${apt.fecha}T${apt.hora_inicio}`,
                extendedProps: {
                    servicio: apt.servicio
                }
            }));
            calendar.removeAllEvents();
            calendar.addEventSource(events);
            calendar.render();
        })
        .subscribe();
}
