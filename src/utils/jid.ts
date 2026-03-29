/**
 * JID formatting helpers for WhatsApp
 */

/**
 * Normalise a bare number like "8801XXXXXXXXX" to a WhatsApp JID.
 * If the value already contains "@" it is returned as-is.
 */
export function toJid(number: string): string {
  if (number.includes('@')) return number;
  const clean = number.replace(/^\+/, '').replace(/\s/g, '');
  return `${clean}@s.whatsapp.net`;
}

/**
 * Normalise to a group JID.
 */
export function toGroupJid(id: string): string {
  if (id.includes('@')) return id;
  return `${id}@g.us`;
}

/**
 * Extract bare number from JID.
 */
export function jidToNumber(jid: string): string {
  return jid.split('@')[0] ?? jid;
}

/**
 * Check if JID is a group.
 */
export function isGroupJid(jid: string): boolean {
  return jid.endsWith('@g.us');
}

/**
 * Check if JID is a broadcast.
 */
export function isBroadcastJid(jid: string): boolean {
  return jid.endsWith('@broadcast');
}
