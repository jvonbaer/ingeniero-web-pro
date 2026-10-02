import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.fundacion-animate.cl',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
