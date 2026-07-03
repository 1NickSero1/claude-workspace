import { UserProfile } from './storage';

// Registro de altas (Google Sheets vía Google Apps Script).
// Configura EXPO_PUBLIC_SIGNUP_WEBHOOK_URL en .env con la URL /exec
// que te da el deployment del Apps Script.
const WEBHOOK_URL = process.env.EXPO_PUBLIC_SIGNUP_WEBHOOK_URL;

type SignupPayload = Pick<UserProfile, 'name' | 'email' | 'createdAt' | 'isAnonymous'>;

/**
 * Fire-and-forget: nunca debe bloquear la navegación ni lanzar un error.
 * Llamar sin await desde el flujo de onboarding.
 */
export function trackSignup(profile: SignupPayload): void {
  if (!WEBHOOK_URL) return;

  const payload = {
    name: profile.name,
    email: profile.email,
    createdAt: profile.createdAt,
    isAnonymous: !!profile.isAnonymous,
  };

  try {
    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {}
}
