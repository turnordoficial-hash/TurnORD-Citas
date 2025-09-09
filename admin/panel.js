import { supabase } from '../database.js';

document.addEventListener('DOMContentLoaded', async () => {
    const adminPanelContainer = document.getElementById('admin-panel-container');
    const negocioId = 'barberia007'; // Hardcoded for now, this should be dynamic in a real app

    const { data: barbers, error: barbersError } = await supabase
        .from('barberos')
        .select('id, nombre')
        .eq('negocio_id', negocioId)
        .order('nombre');

    if (barbersError) {
        console.error('Error fetching barbers:', barbersError);
        adminPanelContainer.innerHTML = '<p class="text-red-500">Error al cargar los barberos.</p>';
        return;
    }

    if (barbers.length === 0) {
        adminPanelContainer.innerHTML = '<p>No se encontraron barberos.</p>';
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    for (const barber of barbers) {
        const barberColumn = document.createElement('div');
        barberColumn.className = 'bg-white p-4 rounded-lg shadow';

        const barberName = document.createElement('h2');
        barberName.className = 'text-xl font-bold mb-2';
        barberName.textContent = barber.nombre;
        barberColumn.appendChild(barberName);

        const { data: appointments, error: appointmentsError } = await supabase
            .from('citas')
            .select('hora_inicio, nombre, servicio')
            .eq('negocio_id', negocioId)
            .eq('barber_id', barber.id)
            .eq('fecha', today)
            .order('hora_inicio');

        if (appointmentsError) {
            console.error(`Error fetching appointments for ${barber.nombre}:`, appointmentsError);
            const errorElement = document.createElement('p');
            errorElement.className = 'text-red-500';
            errorElement.textContent = 'Error al cargar las citas.';
            barberColumn.appendChild(errorElement);
        } else if (appointments.length === 0) {
            const noAppointmentsElement = document.createElement('p');
            noAppointmentsElement.textContent = 'No hay citas para hoy.';
            barberColumn.appendChild(noAppointmentsElement);
        } else {
            const appointmentsList = document.createElement('ul');
            appointmentsList.className = 'space-y-2';

            for (const appointment of appointments) {
                const appointmentItem = document.createElement('li');
                appointmentItem.className = 'p-2 bg-gray-100 rounded';
                appointmentItem.innerHTML = `
                    <p class="font-semibold">${appointment.hora_inicio.substring(0, 5)}</p>
                    <p>${appointment.nombre}</p>
                    <p class="text-sm text-gray-600">${appointment.servicio}</p>
                `;
                appointmentsList.appendChild(appointmentItem);
            }
            barberColumn.appendChild(appointmentsList);
        }

        adminPanelContainer.appendChild(barberColumn);
    }
});
