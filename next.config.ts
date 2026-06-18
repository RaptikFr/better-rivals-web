import type { NextConfig } from 'next';

// En-têtes de sécurité appliqués à toutes les réponses. Volontairement limités
// aux protections qui ne peuvent rien casser des intégrations existantes
// (Supabase, Turnstile, next-themes, recharts) :
//   - HSTS : force HTTPS (Vercel sert déjà en TLS).
//   - X-Frame-Options + CSP frame-ancestors : anti-clickjacking (empêche
//     l'embarquement du site dans une iframe tierce).
//   - X-Content-Type-Options : bloque le MIME sniffing.
//   - Referrer-Policy : ne fuite pas l'URL complète vers les sites externes.
//   - Permissions-Policy : coupe des API navigateur que le site n'utilise pas.
// Une CSP complète restreignant les origines de scripts/connexions reste à
// ajouter séparément (elle doit être testée contre Turnstile/Supabase en prod).
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
