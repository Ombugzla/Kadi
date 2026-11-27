import { verifyToken } from 'npm:@clerk/backend@3.33.1';

export async function verifyClerkSessionToken(token: string) {
  const secretKey = Deno.env.get('CLERK_SECRET_KEY');
  if (!secretKey) throw new Error('Clerk server authentication is not configured.');

  const authorizedParties = (Deno.env.get('CLERK_AUTHORIZED_PARTIES') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!authorizedParties.length) {
    throw new Error('Clerk authorized origins are not configured.');
  }

  const claims = await verifyToken(token, { secretKey, authorizedParties });
  if (typeof claims.sub !== 'string' || !/^user_[A-Za-z0-9]+$/.test(claims.sub)) {
    throw new Error('Clerk session has an invalid user identity.');
  }
  return claims;
}
