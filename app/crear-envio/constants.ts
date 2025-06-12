export const API_BASE = 'https://api-4g7v.onrender.com/api';
export const RUTA_KEY = '5b3ce3597851110001cf6248dbff311ed4d34185911c2eb9e6c50080';

export const tiposCarga = ['Frutas', 'Verduras', 'Granos', 'Lácteos', 'Carnes', 'Pescados', 'Otros'];

export const variedadOptions = [
  'Orgánico certificado',
  'Libre de pesticidas',
  'Comercio justo',
  'Local',
  'Importado',
  'Procesado',
  'Fresco'
];

export const empaquetadoOptions = [
  'Cajas de cartón',
  'Bolsas plásticas', 
  'Sacos de yute',
  'Contenedores refrigerados',
  'Bolsas de malla',
  'Cajas de madera',
  'Envases de vidrio',
  'Bandejas de foam',
  'Bolsas de papel'
];

export const tiposTransporte = [
  { 
    id: 1, 
    nombre: 'Refrigerado', 
    descripcion: 'Para productos que requieren temperatura controlada (0-4°C)'
  },
  { 
    id: 2, 
    nombre: 'Ventilado', 
    descripcion: 'Para productos frescos que necesitan ventilación constante'
  },
  { 
    id: 3, 
    nombre: 'Aislado', 
    descripcion: 'Para productos que requieren protección térmica sin refrigeración'
  }
];

export const transporteIcons: Record<string, any> = {
  Refrigerado: require('../../assets/ico-refrigerado.png'),
  Ventilado:   require('../../assets/ico-ventilado.png'),
  Aislado:     require('../../assets/ico-aislado.png'),
};

export const pasosLabels = ['Ubicación', 'Partición', 'Carga', 'Transporte', 'Confirmar'];

export default {
  pasosLabels,
  tiposCarga,
  variedadOptions,
  empaquetadoOptions,
  tiposTransporte,
  transporteIcons
};
