import { InjectionToken } from '@angular/core';

/** Base URL of the ASP.NET Core API, e.g. `/api` in development (SPEC §6.2). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
