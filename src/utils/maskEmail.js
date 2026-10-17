/**
 * Masks an email address to display only a small portion for privacy/security.
 * e.g., "badlemon58@gmail.com" -> "b***8@gmail.com"
 *
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return ''
  const trimmed = email.trim()
  const atIndex = trimmed.indexOf('@')
  if (atIndex <= 0) return trimmed

  const name = trimmed.slice(0, atIndex)
  const domain = trimmed.slice(atIndex)

  if (name.length <= 2) {
    return `${name[0]}***${domain}`
  }

  return `${name[0]}***${name[name.length - 1]}${domain}`
}
