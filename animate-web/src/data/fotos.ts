// Para cambiar una foto: reemplaza el archivo de src/assets/photos/ conservando su nombre
// (o cambia el nombre de "archivo" aquí) y ajusta el texto alternativo si hace falta.
// Tamaño recomendado: al menos 1600 px de ancho. Con scripts/preparar-foto.mjs se achican solas.
import type { ImageMetadata } from 'astro';

const archivos = import.meta.glob<{ default: ImageMetadata }>('/src/assets/photos/*.{jpg,jpeg,png,webp}', {
  eager: true,
});

export const fotos = {
  hero: { archivo: 'hero-nino-gallina.jpg', alt: 'Un niño sostiene un plato con verduras mientras una gallina picotea.' },
  granja: { archivo: 'granja-ovejas.jpg', alt: 'Niños y niñas acarician ovejas en la granja, acompañados por adultos.' },
  terapeutica: { archivo: 'terapeutica-llama.jpg', alt: 'Una terapeuta sonríe junto a una llama en la granja.' },
  educativa: { archivo: 'educativa-ponchos.jpg', alt: 'Un curso con ponchos celestes levanta los brazos en una pradera.' },
  formativa: { archivo: 'formativa-grupo.jpg', alt: 'Un grupo de estudiantes escucha una explicación al aire libre, bajo un árbol.' },
  bosque: { archivo: 'bosque-arbol.jpg', alt: 'Un grupo de personas conversa en círculo bajo un árbol grande, con cielo azul.' },
  fortalecer: { archivo: 'fortalecer-cordero.jpg', alt: 'Una niña y una terapeuta dan mamadera a un cordero.' },
  terapiaOcupacional: { archivo: 'terapia-ocupacional.jpg', alt: 'Una persona da mamadera a un cordero negro.' },
  fonoaudiologia: { archivo: 'fonoaudiologia-compost.jpg', alt: 'Un niño trabaja con tierra y compost junto a un adulto.' },
  naturaleza: { archivo: 'naturaleza-nino-cordero.jpg', alt: 'Un niño acaricia a un cordero en una pradera verde.' },
  ternero: { archivo: 'animal-ternero.jpg', alt: 'Un ternero café mira a la cámara.' },
  llama: { archivo: 'animal-llama.jpg', alt: 'Una llama blanca en el campo.' },
  caballo: { archivo: 'animal-caballo.jpg', alt: 'Una niña acaricia un caballo a través de un cerco de madera.' },
  pavo: { archivo: 'animal-pavo.jpg', alt: 'Un pavo real de plumaje azul, de frente.' },
  invernadero: { archivo: 'invernadero.jpg', alt: 'Niños y una profesora cosechan lechugas dentro de un invernadero.' },
  llamaCielo: { archivo: 'llama-cielo.jpg', alt: 'Una llama blanca frente a un cielo despejado.' },
} as const;

export type RolFoto = keyof typeof fotos;

export function foto(rol: RolFoto) {
  const { archivo, alt } = fotos[rol];
  const modulo = archivos[`/src/assets/photos/${archivo}`];
  if (!modulo) throw new Error(`Falta la foto "${archivo}" en src/assets/photos/ (rol "${rol}").`);
  return { src: modulo.default, alt };
}
