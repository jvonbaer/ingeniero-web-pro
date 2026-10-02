// Uso: node scripts/preparar-foto.mjs <origen> <nombre-destino.jpg>
// Reduce una foto a 1600 px de ancho máximo y la deja en src/assets/photos/.
import sharp from 'sharp';
const [, , origen, destino] = process.argv;
if (!origen || !destino) {
  console.error('Uso: node scripts/preparar-foto.mjs <origen> <nombre-destino.jpg>');
  process.exit(1);
}
await sharp(origen)
  .rotate()
  .resize({ width: 1600, withoutEnlargement: true })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(`src/assets/photos/${destino}`);
console.log('listo:', destino);
