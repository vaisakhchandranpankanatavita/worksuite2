import type { Employee } from '../data/mock'

/** Placeholder portrait for demo purposes; Avatar falls back to initials if offline. */
export const photoFor = (e: Pick<Employee, 'id' | 'gender'>) =>
  `https://randomuser.me/api/portraits/${e.gender === 'F' ? 'women' : 'men'}/${Number(e.id.replace(/\D/g, '')) % 90}.jpg`
