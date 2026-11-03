const DEFAULT_HEADERS = {
  'User-Agent': 'Tenjin/1.0',
  Accept: 'application/json',
};

export async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...DEFAULT_HEADERS, ...options.headers },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url}`);
  }
  return res.json();
}

export async function fetchStream(url, headers = {}) {
  const res = await fetch(url, {
    headers: { ...DEFAULT_HEADERS, ...headers },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url}`);
  }
  return res;
}
