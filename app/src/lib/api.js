export async function api(path, opts = {}) {
  try {
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return { ok: false, error: text || response.status };
    }
    return data;
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
