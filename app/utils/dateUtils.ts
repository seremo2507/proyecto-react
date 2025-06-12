export const formatearFecha = (fechaIso?: string) => {
  if (!fechaIso) return 'Fecha no disponible';
  try {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) return 'Fecha no disponible';
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const año = fecha.getFullYear();
    return `${dia}/${mes}/${año}`;
  } catch {
    return 'Fecha no disponible';
  }
};

export const formatearHora = (horaIso?: string) => {
  if (!horaIso) return 'Hora no disponible';
  try {
    const hora = new Date(horaIso);
    if (isNaN(hora.getTime())) return 'Hora no disponible';
    const horas = String(hora.getUTCHours()).padStart(2, '0');
    const minutos = String(hora.getUTCMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  } catch {
    return 'Hora no disponible';
  }
}; 