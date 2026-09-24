import type { Employee } from '../data/mock.js'

/**
 * Placeholder portrait for demo purposes; Avatar falls back to initials if
 * offline. Uses pravatar.cc at 512×512 (vs. randomuser.me's fixed 128×128)
 * so large profile photos don't look pixelated.
 */
export const photoFor = (e: Pick<Employee, 'id' | 'gender'>) =>
  `https://i.pravatar.cc/512?img=${(Number(e.id.replace(/\D/g, '')) % 70) + 1}`
