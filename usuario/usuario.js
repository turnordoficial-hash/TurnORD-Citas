import { supabase } from '../database.js';

// --- Helper Functions ---
/**
 * Obtiene el ID del negocio desde el atributo `data-negocio-id` en el body.
 */
function getNegocioId() {
    const id = document.body.dataset.negocioId;
    if (!id) {
        console.error('Error crítico: Atributo data-negocio-id no encontrado en el body.');
        alert('Error de configuración: No se pudo identificar la página del negocio.');
    }
    return id;
}

/**
 * Formatea una fecha a 'YYYY-MM-DD'
 */
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// --- DOM Elements ---
const negocioId = getNegocioId();
const bookingInterface = document.getElementById('booking-interface');
const serviceSelect = document.getElementById('servicio');
const dateSelectionDiv = document.getElementById('date-selection');
const datePicker = document.getElementById('date-picker');
const timeSlotSelectionDiv = document.getElementById('time-slot-selection');
const timeSlotsContainer = document.getElementById('time-slots');
const timeSlotMessage = document.getElementById('time-slot-message');
const customerDetailsDiv = document.getElementById('customer-details');
const nombreInput = document.getElementById('nombre');
const telefonoInput = document.getElementById('telefono');
const reserveButton = document.getElementById('btn-reservar');
const confirmationMessageContainer = document.getElementById('confirmation-message');

// --- State ---
let servicesCache = {};
let configCache = {};
let selectedService = null;
let selectedDate = null;
let selectedTimeSlot = null;

// --- Data Fetching ---

/**
 * Carga la configuración del negocio (horarios, días de operación).
 */
async function fetchBusinessConfig() {
    if (!negocioId) return;
    try {
        const { data, error } = await supabase
            .from('configuracion_negocio')
            .select('hora_apertura, hora_cierre, dias_operacion')
            .eq('negocio_id', negocioId)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            configCache = data;
        } else {
            // Provide default values if no configuration is found
            console.warn(`No configuration found for negocio_id '${negocioId}'. Using default values.`);
            configCache = {
                hora_apertura: '09:00',
                hora_cierre: '18:00',
                dias_operacion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
            };
        }

        // Set min/max for date picker
        datePicker.min = formatDate(new Date());

    } catch (error) {
        console.error('Error fetching business configuration:', error.message);
        bookingInterface.innerHTML = '<p class="text-red-500">No se pudo cargar la configuración del negocio. Intente más tarde.</p>';
    }
}

/**
 * Carga los servicios activos y los popula en el dropdown.
 */
async function fetchActiveServices() {
    if (!negocioId) return;
    try {
        const { data, error } = await supabase
            .from('servicios')
            .select('nombre, duracion_min')
            .eq('negocio_id', negocioId)
            .eq('activo', true)
            .order('nombre', { ascending: true });

        if (error) throw error;

        servicesCache = {};
        data.forEach(s => { servicesCache[s.nombre] = s.duracion_min; });

        serviceSelect.innerHTML = '<option value="">Selecciona un servicio</option>' +
            data.map(s => `<option value="${s.nombre}">${s.nombre} (${s.duracion_min} min)</option>`).join('');

    } catch (e) {
        console.error('Error fetching services:', e);
        serviceSelect.disabled = true;
        serviceSelect.innerHTML = '<option value="">No se pudieron cargar los servicios</option>';
    }
}


// --- Core Booking Logic ---

/**
 * Genera los horarios disponibles para una fecha y servicio dados.
 */
async function generateAvailableTimeSlots() {
    if (!selectedDate || !selectedService || !configCache.hora_apertura) {
        return;
    }

    timeSlotsContainer.innerHTML = '';
    timeSlotMessage.textContent = 'Buscando horarios disponibles...';

    const serviceDuration = servicesCache[selectedService];
    const { hora_apertura, hora_cierre } = configCache;

    // Fetch existing appointments for the selected date
    const { data: bookedAppointments, error } = await supabase
        .from('citas')
        .select('hora_inicio')
        .eq('negocio_id', negocioId)
        .eq('fecha', selectedDate);

    if (error) {
        console.error('Error fetching booked appointments:', error);
        timeSlotMessage.textContent = 'Error al buscar horarios.';
        return;
    }

    const bookedSlots = new Set(bookedAppointments.map(a => a.hora_inicio.substring(0, 5)));

    const availableSlots = [];
    let currentTime = new Date(`${selectedDate}T${hora_apertura}`);
    const closingTime = new Date(`${selectedDate}T${hora_cierre}`);

    while (currentTime < closingTime) {
        const slot = currentTime.toTimeString().substring(0, 5);

        const slotEndTime = new Date(currentTime.getTime() + serviceDuration * 60000);
        if (slotEndTime > closingTime) {
            break;
        }

        if (!bookedSlots.has(slot)) {
            availableSlots.push(slot);
        }

        currentTime = new Date(currentTime.getTime() + serviceDuration * 60000);
    }

    displayTimeSlots(availableSlots);
}

/**
 * Muestra los botones de los horarios disponibles.
 */
function displayTimeSlots(slots) {
    if (slots.length === 0) {
        timeSlotMessage.textContent = 'No hay horarios disponibles para esta fecha.';
        return;
    }
    timeSlotMessage.textContent = 'Selecciona un horario:';
    slots.forEach(slot => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = slot;
        button.className = 'p-2 border rounded-lg hover:bg-blue-600 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:hover:bg-blue-700';
        button.addEventListener('click', () => handleTimeSlotSelection(slot, button));
        timeSlotsContainer.appendChild(button);
    });
}

// --- Notifications ---

/**
 * Solicita permiso para mostrar notificaciones.
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log("This browser does not support desktop notification");
        return;
    }
    if (Notification.permission !== 'denied') {
        await Notification.requestPermission();
    }
}

/**
 * Muestra una notificación de confirmación de cita.
 */
function showBookingConfirmationNotification(bookingDetails) {
    if (Notification.permission === 'granted') {
        const { nombre, fecha, hora_inicio } = bookingDetails;
        const notificationBody = `Tu cita para el ${fecha} a las ${hora_inicio} ha sido confirmada.`;

        new Notification('¡Cita Confirmada!', {
            body: notificationBody,
            icon: 'imegenlogin/favicon-32x32.png' // Optional: add an icon
        });
    }
}


// --- Core Booking Logic ---

/**
 * Maneja la reserva final de la cita.
 */
async function handleBooking() {
    const nombre = nombreInput.value.trim();
    const telefono = telefonoInput.value.trim();

    if (!nombre) {
        alert('Por favor, ingresa tu nombre.');
        return;
    }
    if (!selectedService || !selectedDate || !selectedTimeSlot) {
        alert('Por favor, completa todos los pasos de la reserva.');
        return;
    }

    reserveButton.disabled = true;
    reserveButton.textContent = 'Reservando...';

    try {
        const { error } = await supabase.from('citas').insert([{
            negocio_id: negocioId,
            nombre: nombre,
            telefono: telefono,
            servicio: selectedService,
            fecha: selectedDate,
            hora_inicio: selectedTimeSlot,
            estado: 'programada'
        }]);

        if (error) {
            // Handle unique constraint violation (double booking)
            if (error.code === '23505') {
                 throw new Error('Este horario acaba de ser reservado. Por favor, elige otro.');
            }
            throw error;
        }

        confirmationMessageContainer.innerHTML = `
            <div class="bg-green-100 text-green-800 rounded-xl p-4 shadow mt-4 text-center">
                <h3 class="font-bold text-lg">¡Cita Confirmada!</h3>
                <p>Gracias, ${nombre}.</p>
                <p>Te esperamos el <strong>${selectedDate}</strong> a las <strong>${selectedTimeSlot}</strong>.</p>
            </div>`;

        bookingInterface.style.display = 'none'; // Hide form

        // Request permission and show notification
        await requestNotificationPermission();
        showBookingConfirmationNotification({
            nombre: nombre,
            fecha: selectedDate,
            hora_inicio: selectedTimeSlot
        });

    } catch (error) {
        confirmationMessageContainer.innerHTML = `
            <div class="bg-red-100 text-red-800 rounded-xl p-4 shadow mt-4">
                <h3 class="font-bold">Error al reservar</h3>
                <p>${error.message}</p>
            </div>`;
    } finally {
        reserveButton.disabled = false;
        reserveButton.textContent = 'Confirmar Cita';
    }
}


// --- UI State & Event Handlers ---

/**
 * Actualiza la visibilidad de las secciones del formulario.
 */
function updateUIState() {
    dateSelectionDiv.classList.toggle('hidden', !selectedService);
    timeSlotSelectionDiv.classList.toggle('hidden', !selectedDate);
    customerDetailsDiv.classList.toggle('hidden', !selectedTimeSlot);
    reserveButton.disabled = !selectedService || !selectedDate || !selectedTimeSlot || !nombreInput.value;
}

function handleServiceSelection(event) {
    selectedService = event.target.value;
    // Reset subsequent selections
    selectedDate = null;
    datePicker.value = '';
    selectedTimeSlot = null;
    timeSlotsContainer.innerHTML = '';
    timeSlotMessage.textContent = '';
    updateUIState();
}

async function handleDateSelection(event) {
    selectedDate = event.target.value;
    // Reset subsequent selections
    selectedTimeSlot = null;
    timeSlotsContainer.innerHTML = '';

    if (selectedDate) {
        await generateAvailableTimeSlots();
    }
    updateUIState();
}

function handleTimeSlotSelection(slot, buttonEl) {
    selectedTimeSlot = slot;
    // Update button styles to show selection
    const buttons = timeSlotsContainer.querySelectorAll('button');
    buttons.forEach(btn => btn.classList.remove('bg-blue-600', 'text-white', 'dark:bg-blue-700'));
    buttonEl.classList.add('bg-blue-600', 'text-white', 'dark:bg-blue-700');
    updateUIState();
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', async () => {
    if (!negocioId) return;

    // Initial UI state
    updateUIState();

    // Fetch data
    await fetchBusinessConfig();
    await fetchActiveServices();

    // Setup event listeners
    serviceSelect.addEventListener('change', handleServiceSelection);
    datePicker.addEventListener('change', handleDateSelection);
    nombreInput.addEventListener('input', updateUIState);
    reserveButton.addEventListener('click', handleBooking);
});
