'use server';

import type { Route } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSitePasscode } from '@/lib/access/config';
import { safeNextPath } from '@/lib/access/redirect';
import {
  ACCESS_COOKIE,
  ACCESS_TTL_SECONDS,
  createAccessToken,
  passcodeMatches,
} from '@/lib/access/token';

export interface UnlockState {
  error: string | null;
}

/** Small fixed delay after a wrong passcode to slow down guessing. */
const FAILURE_DELAY_MS = 600;

export async function unlock(_previous: UnlockState, formData: FormData): Promise<UnlockState> {
  const configured = getSitePasscode();
  if (configured === '') {
    return { error: 'Access is not configured. Set SITE_PASSCODE and restart the app.' };
  }

  const submitted = formData.get('passcode');
  if (typeof submitted !== 'string' || submitted === '') {
    return { error: 'Enter the passcode.' };
  }

  if (!(await passcodeMatches(submitted, configured))) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return { error: 'That passcode is not correct.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_COOKIE, await createAccessToken(configured), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TTL_SECONDS,
  });

  redirect(safeNextPath(formData.get('next')) as Route);
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  redirect('/access');
}
