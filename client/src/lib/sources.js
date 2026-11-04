const DEFAULT_SOURCE = 'mangapill';

export function getActiveSource() {
  try {
    return localStorage.getItem('tenjin:source') || DEFAULT_SOURCE;
  } catch {
    return DEFAULT_SOURCE;
  }
}

export function setActiveSource(source) {
  try {
    localStorage.setItem('tenjin:source', source);
  } catch {}
}
