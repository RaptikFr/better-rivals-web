import type { NextConfig } from 'next';

// En-têtes de sécurité appliqués à toutes les réponses.
//   - HSTS : force HTTPS (Vercel sert déjà en TLS).
//   - X-Frame-Options + CSP frame-ancestors : anti-clickjacking (empêche
//     l'embarquement du site dans une iframe tierce).
//   - X-Content-Type-Options : bloque le MIME sniffing.
//   - Referrer-Policy : ne fuite pas l'URL complète vers les sites externes.
//   - Permissions-Policy : coupe des API navigateur que le site n'utilise pas.
//   - CSP : origines autorisées limitées à ce que le site charge réellement
//     (audité le 28 juillet 2026 — pas d'images/fonts externes, pas d'analytics).
//     `script-src`/`style-src` gardent 'unsafe-inline' car le site n'a pas
//     d'infra de nonce (script de anti-flash de thème dans app/layout.tsx +
//     next-themes + styles inline React/Tailwind) — toujours un vrai gain vs.
//     l'absence de CSP : bloque le chargement de script/frame depuis un
//     domaine non listé (XSS par injection de <script src> externe).
//     ⚠️ Testé en dev uniquement (headers présents, pas de violation console
//     sur les pages clés) — à re-vérifier en prod sur /contact (Turnstile) et
//     une page authentifiée (Supabase Realtime) après déploiement.
const SUPABASE_ORIGIN = 'https://hmtgzqbxymspauusziyh.supabase.co';
const SUPABASE_WS_ORIGIN = 'wss://hmtgzqbxymspauusziyh.supabase.co';
const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE_ORIGIN}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS_ORIGIN} ${TURNSTILE_ORIGIN}`,
  `frame-src ${TURNSTILE_ORIGIN}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: csp },
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
