import { useState, useEffect, useRef, useCallback } from 'react';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

export function useApi(interval = 5000) {
  const [data, setData] = useState({
    pending: [],
    inProgress: [],
    done: [],
    failed: [],
    containers: [],
    repositories: [],
    online: false,
  });
  const [logs, setLogs] = useState([]);
  const [serverHealth, setServerHealth] = useState(null);
  const logOffset = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [pending, inProgress, done, failed, containers, repositories, health] =
        await Promise.all([
          fetchJSON('/tasks/pending'),
          fetchJSON('/tasks/inProgress'),
          fetchJSON('/tasks/done'),
          fetchJSON('/tasks/failed'),
          fetchJSON('/containers'),
          fetchJSON('/repositories'),
          fetchJSON('/health'),
        ]);

      setData({ pending, inProgress, done, failed, containers, repositories, online: true });
      setServerHealth(health);
    } catch {
      setData((prev) => ({ ...prev, online: false }));
    }

    try {
      const result = await fetchJSON(`/logs?offset=${logOffset.current}`);
      if (result.lines?.length) {
        setLogs((prev) => [...prev, ...result.lines]);
        logOffset.current = result.nextOffset;
      }
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, interval);
    return () => clearInterval(id);
  }, [refresh, interval]);

  const submitTask = useCallback(async ({ title, project, priority, body }) => {
    await fetch('/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: body, project, title, priority }),
    });
    refresh();
  }, [refresh]);

  const cloneRepo = useCallback(async (url) => {
    const res = await fetch('/repositories/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || 'Clone failed');
    refresh();
    return json;
  }, [refresh]);

  return { data, logs, submitTask, cloneRepo, serverHealth, refresh };
}
