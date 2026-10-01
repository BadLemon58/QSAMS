export function formatName(profile) {
  if (!profile) return 'Unknown';
  if (profile.last_name && profile.first_name) {
    return `${profile.last_name}, ${profile.first_name}`;
  }
  
  const fullName = profile.full_name || profile.name || 'Unknown';
  if (fullName.includes(',')) return fullName;
  
  const parts = fullName.trim().split(' ');
  if (parts.length > 1) {
    const last = parts.pop();
    const first = parts.join(' ');
    return `${last}, ${first}`;
  }
  return fullName;
}
