export async function api(path, opts) {
  try {
    const r = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const text = await r.text();
    let j = {};
    try {
      j = text ? JSON.parse(text) : {};
    } catch {
      return { ok: false, error: text || r.status };
    }
    return j;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
