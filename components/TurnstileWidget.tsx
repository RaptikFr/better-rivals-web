"use client";

import { useEffect, useRef } from 'react';

// Captcha invisible/léger Cloudflare Turnstile.
// Ne s'affiche que si NEXT_PUBLIC_TURNSTILE_SITE_KEY est définie ;
// la vérification serveur (TURNSTILE_SECRET_KEY) est elle aussi
// conditionnelle, le formulaire fonctionne donc sans les clés.
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const SCRIPT_ID  = 'cf-turnstile-script';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset:  (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export default function TurnstileWidget({
  onToken,
  resetSignal = 0,
}: {
  // Reçoit le jeton à joindre à la requête, ou null s'il a expiré/échoué
  onToken: (token: string | null) => void;
  // Incrémenter pour forcer un nouveau défi (les jetons sont à usage unique)
  resetSignal?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef  = useRef<string | null>(null);
  const onTokenRef   = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id    = SCRIPT_ID;
      script.src   = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    let cancelled = false;
    const tryRender = setInterval(() => {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      clearInterval(tryRender);
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey:            TURNSTILE_SITE_KEY,
        theme:              'auto',
        language:           'fr',
        callback:           (token: string) => onTokenRef.current(token),
        'expired-callback': () => onTokenRef.current(null),
        'error-callback':   () => onTokenRef.current(null),
      });
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(tryRender);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onTokenRef.current(null);
    }
  }, [resetSignal]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={containerRef} className="flex justify-center" />;
}
