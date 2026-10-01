/** @type {import('next').NextConfig} */

// API (Render). Usada pelo rewrite do painel; o navegador chama /api/* no
// próprio domínio do front, e o cookie de sessão fica first-party.
// Na Vercel, sem API_URL o painel apontaria para localhost: falha o build.
if (process.env.VERCEL && !process.env.API_URL) {
  throw new Error("API_URL é obrigatória na Vercel (URL do Render, sem / no fim).");
}
const apiUrl = (process.env.API_URL || "http://localhost:8080").replace(/\/+$/, "");

const nextConfig = {
  // Pasta de build alternativa (ex.: build de verificação com o `next dev` aberto)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  images: {
    // As imagens já chegam em WebP redimensionado (back-end): sem otimizador
    // da Vercel (limites do plano gratuito e advisory do Image Optimizer).
    unoptimized: true,
    remotePatterns: [
      // URLs assinadas do bucket privado (S3, sa-east-1)
      { protocol: "https", hostname: "*.s3.sa-east-1.amazonaws.com" },
      { protocol: "https", hostname: "s3.sa-east-1.amazonaws.com" },
    ],
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
  async headers() {
    return [
      {
        // Respostas do painel nunca em cache no rewrite da Vercel
        source: "/api/:path*",
        headers: [{ key: "x-vercel-enable-rewrite-caching", value: "0" }],
      },
    ];
  },
};

export default nextConfig;
