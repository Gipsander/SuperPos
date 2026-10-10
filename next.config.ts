import type { NextConfig } from 'next';

// Exportación estática: se puede publicar en GitHub Pages (defina NEXT_PUBLIC_BASE_PATH=/Superpos-prototipo).
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: { unoptimized: true },
};

export default nextConfig;
