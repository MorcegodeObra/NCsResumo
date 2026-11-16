/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdf.js tenta importar "canvas" só no Node; no navegador não é necessário.
    config.resolve.alias.canvas = false;
    return config;
  },
};
export default nextConfig;
