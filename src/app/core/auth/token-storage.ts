import { Injectable } from '@angular/core';
import { Session } from './auth.models';

const STORAGE_KEY = 'fcm.session';

/** Wraps `localStorage` for the session; every access is safe if storage is unavailable (SPEC §7.2). */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  read(): Session | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      return isSession(value) ? value : null;
    } catch {
      return null;
    }
  }

  write(session: Session): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage unavailable; the session still works until the page is reloaded.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear.
    }
  }
}

function isSession(value: unknown): value is Session {
  if (value === null || typeof value !== 'object') return false;
  const s = value as Partial<Session>;
  return (
    typeof s.accessToken === 'string' &&
    typeof s.expiresAt === 'string' &&
    !Number.isNaN(Date.parse(s.expiresAt)) &&
    typeof s.user?.id === 'string' &&
    typeof s.user.email === 'string' &&
    typeof s.user.displayName === 'string'
  );
}
