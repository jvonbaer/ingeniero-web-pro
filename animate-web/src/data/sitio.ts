// Datos del sitio que cambian con frecuencia. Edita aquí, no en las páginas.

export const sitio = {
  nombre: 'Fundación Anímate',
  bajada: 'Fundación de Terapias y Educación Asistidas con Animales',
  descripcion:
    'Terapias y educación asistidas con animales como apoyo complementario al bienestar y la salud mental, en La Araucanía.',
  url: 'https://www.fundacion-animate.cl',
};

export const contacto = {
  telefono: '', // Pendiente: teléfono institucional. Si queda vacío, no se muestra.
  web: 'www.fundacion-animate.cl',
  correo: 'informaciones.animate@gmail.com',
  direccion: 'Parcela 11, Jardín del Edén, Padre Las Casas',
  region: 'Región de La Araucanía, Chile',
  instagram: { usuario: '@fundacion_animate', url: 'https://www.instagram.com/fundacion_animate/' },
  sede: 'Granja Educativa «Llamas del Sur», Huichahue',
  mapaUrl: 'https://www.google.com/maps/search/?api=1&query=Parcela+11+Jard%C3%ADn+del+Ed%C3%A9n+Padre+Las+Casas+La+Araucan%C3%ADa',
  comoLlegar: 'A media hora de Temuco, camino a Cunco, en el sector Jardín del Edén (Huichahue), comuna de Padre Las Casas.',
};

export const personeria =
  'Institución de la sociedad civil sin fines de lucro. Personería jurídica obtenida en septiembre de 2021.';

export type ItemMenu = { texto: string; href: string; hijos?: ItemMenu[] };

export const menu: ItemMenu[] = [
  {
    texto: 'Quiénes somos',
    href: '/quienes-somos/',
    hijos: [
      { texto: 'Nuestra historia', href: '/quienes-somos/' },
      { texto: 'Equipo', href: '/equipo/' },
    ],
  },
  {
    texto: 'Qué hacemos',
    href: '/modelo/',
    hijos: [
      { texto: 'Modelo Anímate', href: '/modelo/' },
      { texto: 'Terapéutica', href: '/terapeutica/' },
      { texto: 'Educativa', href: '/educativa/' },
      { texto: 'Formativa', href: '/formativa/' },
    ],
  },
  { texto: 'Proyectos', href: '/proyectos/' },
  { texto: 'Contacto', href: '/contacto/' },
];

export const llamadoDona = { texto: 'Dona', href: '/dona/' };

// Cifras de impacto (por ejemplo, según la FECU Social). Mientras esté vacío, la sección no se muestra.
// Ejemplo: { valor: '1.200', texto: 'atenciones realizadas en 2025' }
export const impacto: { valor: string; texto: string }[] = [];

// Contexto regional. Fuentes de la propuesta original: hay que revisar si existen cifras más nuevas.
export const contextoRegional = [
  { valor: '17,4 %', texto: 'de la población de La Araucanía vive en pobreza por ingresos, la más alta del país.', fuente: 'CASEN 2021' },
  { valor: '5,9 %', texto: 'vive en pobreza extrema: el segundo lugar nacional, después de Tarapacá.', fuente: 'CASEN 2021' },
  { valor: '5,8 %', texto: 'de las personas de 2 a 17 años de la región está en situación de discapacidad.', fuente: 'ENDISC 2021' },
];

export const experiencias = [
  { nombre: 'Proyecto CARENO', detalle: 'Terapias individuales y talleres con cuidadores', lugar: 'Loncoche y Vilcún', color: 'turquesa' },
  { nombre: 'Terapia complementaria PIE', detalle: 'Atención individual para estudiantes', lugar: 'Liceo del Desarrollo, Temuco', color: 'morado' },
  { nombre: 'Convivencia escolar', detalle: 'Terapia y talleres socioemocionales', lugar: 'Escuela El Tesoro, San Ramón', color: 'sol' },
  { nombre: 'SENADIS', detalle: 'Programa de bienestar emocional con naturaleza y animales', lugar: 'Vilcún', color: 'lima' },
] as const;

// Convenios y reconocimientos. Confirmar que sigan vigentes antes de publicar.
export const alianzas = [
  'Universidad de La Frontera',
  'Universidad Católica de Temuco',
  'Municipalidad de Padre Las Casas',
  'Municipalidad de Vilcún',
  'IAHAIO · miembro asociado',
];

// Formas de colaborar. Rellenar cuando estén definidos los mecanismos (transferencia, certificado, etc.).
export const formasDeColaborar: { titulo: string; texto: string }[] = [
  { titulo: 'Donación', texto: 'Tu aporte financia terapias y programas para quienes más lo necesitan.' },
  { titulo: 'Empresas e instituciones', texto: 'Alianzas para llevar bienestar a más comunidades de La Araucanía.' },
  { titulo: 'Visita la granja', texto: 'Conoce el espacio donde trabajamos y a los animales que nos acompañan.' },
];
