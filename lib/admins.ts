export const ADMIN_EMAILS = new Set([
  'codraptik@gmail.com',
]);

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.has(email);
}
