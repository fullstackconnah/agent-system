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
  const logOffset = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [pending, inProgress, done, failed, containers, repositories] =
        await Promise.all([
          fetchJSON('/api/tasks?status=pending'),
          fetchJSON('/api/tasks?status=in_progress'),
          fetchJSON('/api/tasks?status=done'),
          fetchJSON('/api/tasks?status=failed'),
          fetchJSON('/api/containers'),
          fetchJSON('/api/repositories'),
        ]);

      setData({ pending, inProgress, done, failed, containers, repositories, online: true });
    } catch {
      setData((prev) => ({ ...prev, online: false }));
    }

    try {
      const result = await fetchJSON(`/api/logs?offset=${logOffset.current}`);
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
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, project, priority }),
    });
    refresh();
  }, [refresh]);

  const cloneRepo = useCallback(async (url) => {
    const res = await fetch('/api/repositories/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || 'Clone failed');
    refresh();
    return json;
  }, [refresh]);

  return { data, logs, submitTask, cloneRepo, refresh };
}
