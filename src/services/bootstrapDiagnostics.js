const withTimeout = async (promise, ms = 4000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await promise(controller.signal);
  } finally {
    clearTimeout(timer);
  }
};

const probeJson = async (url, label, timeoutMs = 4000) => {
  try {
    const res = await withTimeout((signal) => fetch(url, { signal }), timeoutMs);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.log(`[MoodGluco][${label}] KO ${res.status} ${body ? `- ${body}` : ''}`.trim());
      return false;
    }
    const data = await res.json().catch(() => ({}));
    console.log(`[MoodGluco][${label}] OK ${url} ${JSON.stringify(data)}`);
    return true;
  } catch (error) {
    console.log(`[MoodGluco][${label}] KO ${url} - ${error?.message || error}`);
    return false;
  }
};

const probeText = async (url, label, timeoutMs = 4000) => {
  try {
    const res = await withTimeout((signal) => fetch(url, { signal }), timeoutMs);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.log(`[MoodGluco][${label}] KO ${res.status} ${body ? `- ${body}` : ''}`.trim());
      return false;
    }
    const body = await res.text().catch(() => '');
    console.log(`[MoodGluco][${label}] OK ${url} ${body ? `- ${body}` : ''}`.trim());
    return true;
  } catch (error) {
    console.log(`[MoodGluco][${label}] KO ${url} - ${error?.message || error}`);
    return false;
  }
};

const probeWithFallbacks = async (urls, label) => {
  for (const url of urls) {
    const ok = await probeJson(url, label);
    if (ok) return true;
  }
  return false;
};

export const runBootstrapDiagnostics = async () => {
  const host = process.env.EXPO_PUBLIC_BACKEND_HOST || '127.0.0.1';
  const ollamaEndpoint = process.env.EXPO_PUBLIC_OLLAMA_ENDPOINT || `http://${host}:11434`;
  const ttsPorts = [
    ['tts-edge', 5003],
    ['tts-kokoro', 5004],
    ['tts-piper', 5005],
    ['tts-xtts', 5002],
  ];
  const localOllamaUrls = [
    ollamaEndpoint,
    `http://127.0.0.1:11434`,
    `http://localhost:11434`,
    `http://${host}:11434`,
  ];

  console.log(`[MoodGluco] Boot diagnostics starting. backend_host=${host} ollama=${ollamaEndpoint}`);
  console.log(`[MoodGluco] Tip: if Ollama fails, run: npm run ollama:start:lan`);

  const checks = [
    probeJson(`http://${host}:5006/health`, 'vision'),
    probeWithFallbacks([...new Set(localOllamaUrls)].filter(Boolean).map((u) => `${u.replace(/\/$/, '')}/api/tags`), 'ollama'),
    ...ttsPorts.map(([label, port]) => probeJson(`http://${host}:${port}/health`, label)),
  ];

  const results = await Promise.all(checks);
  const summary = results.every(Boolean) ? 'ALL_OK' : 'SOME_FAILED';
  console.log(`[MoodGluco] Boot diagnostics done: ${summary}`);
  return results;
};
