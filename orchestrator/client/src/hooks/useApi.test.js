import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApi } from './useApi';

function mockFetch(responses = {}) {
  return vi.fn((url) => {
    // Strip query params for matching if no exact match
    const baseUrl = url.split('?')[0];
    const data = responses[url] ?? responses[baseUrl] ?? [];
    if (data instanceof Error) {
      return Promise.reject(data);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    });
  });
}

describe('useApi', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialise with default empty state', () => {
    global.fetch = mockFetch();
    const { result } = renderHook(() => useApi(60000));

    expect(result.current.data.pending).toEqual([]);
    expect(result.current.data.inProgress).toEqual([]);
    expect(result.current.data.done).toEqual([]);
    expect(result.current.data.failed).toEqual([]);
    expect(result.current.data.containers).toEqual([]);
    expect(result.current.data.online).toBe(false);
    expect(result.current.logs).toEqual([]);
  });

  it('should fetch and populate data on mount', async () => {
    const pending = [{ filename: 'task-1.md', project: 'test' }];
    const done = [{ filename: 'task-2.md', project: 'test' }];
    const containers = [{ id: 'abc123', name: 'agent-1', image: 'claude-agent:latest', status: 'running' }];

    global.fetch = mockFetch({
      '/api/tasks?status=pending': pending,
      '/api/tasks?status=in_progress': [],
      '/api/tasks?status=done': done,
      '/api/tasks?status=failed': [],
      '/api/containers': containers,
      '/api/repositories': [],
      '/api/logs': { lines: ['[2024-01-01] INFO: test log'], nextOffset: 1 },
    });

    const { result } = renderHook(() => useApi(60000));

    await waitFor(() => {
      expect(result.current.data.online).toBe(true);
    });

    expect(result.current.data.pending).toEqual(pending);
    expect(result.current.data.done).toEqual(done);
    expect(result.current.data.containers).toEqual(containers);
    expect(result.current.logs).toEqual(['[2024-01-01] INFO: test log']);
    // repositories field should be present
    expect(Array.isArray(result.current.data.repositories)).toBe(true);
  });

  it('should set online to false when fetch fails', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    const { result } = renderHook(() => useApi(60000));

    await waitFor(() => {
      // online starts false and stays false on error
      expect(result.current.data.online).toBe(false);
    });

    // Verify fetch was actually called
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should submit a task via POST to /api/tasks', async () => {
    global.fetch = mockFetch({
      '/api/tasks?status=pending': [],
      '/api/tasks?status=in_progress': [],
      '/api/tasks?status=done': [],
      '/api/tasks?status=failed': [],
      '/api/containers': [],
      '/api/repositories': [],
      '/api/logs': { lines: [], nextOffset: 0 },
      '/api/tasks': { status: 'accepted' },
    });

    const { result } = renderHook(() => useApi(60000));

    await waitFor(() => {
      expect(result.current.data.online).toBe(true);
    });

    await act(async () => {
      await result.current.submitTask({
        title: 'Test Task',
        project: 'myproject',
        priority: 'high',
        body: 'Task description',
      });
    });

    const postCall = global.fetch.mock.calls.find(
      (call) => call[0] === '/api/tasks' && call[1]?.method === 'POST'
    );
    expect(postCall).toBeTruthy();
    const postedBody = JSON.parse(postCall[1].body);
    expect(postedBody).toEqual({
      title: 'Test Task',
      body: 'Task description',
      project: 'myproject',
      priority: 'high',
    });
  });

  it('should accumulate logs with incremental offset', async () => {
    global.fetch = vi.fn((url) => {
      if (url === '/api/logs?offset=0') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ lines: ['log line 1'], nextOffset: 1 }),
        });
      }
      if (url === '/api/logs?offset=1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ lines: ['log line 2'], nextOffset: 2 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    const { result } = renderHook(() => useApi(5000));

    await waitFor(() => {
      expect(result.current.logs).toEqual(['log line 1']);
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current.logs).toEqual(['log line 1', 'log line 2']);
    });
  });

  it('should remain online even if /health is not called', async () => {
    // Verifies that /health is no longer in Promise.all and doesn't affect online status
    let healthCalled = false;
    global.fetch = vi.fn((url) => {
      if (url === '/health') {
        healthCalled = true;
        return Promise.reject(new Error('health down'));
      }
      const baseUrl = url.split('?')[0];
      const responses = {
        '/api/tasks': [],
        '/api/containers': [],
        '/api/repositories': [],
        '/api/logs': { lines: [], nextOffset: 0 },
      };
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses[baseUrl] ?? []),
      });
    });

    const { result } = renderHook(() => useApi(60000));

    await waitFor(() => {
      expect(result.current.data.online).toBe(true);
    });

    // /health should not have been called as part of the data fetch
    expect(healthCalled).toBe(false);
  });

  it('should refresh data on interval', async () => {
    global.fetch = mockFetch({
      '/api/tasks?status=pending': [],
      '/api/tasks?status=in_progress': [],
      '/api/tasks?status=done': [],
      '/api/tasks?status=failed': [],
      '/api/containers': [],
      '/api/repositories': [],
      '/api/logs': { lines: [], nextOffset: 0 },
    });

    renderHook(() => useApi(5000));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const initialCallCount = global.fetch.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(global.fetch.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it('should expose a refresh function', async () => {
    global.fetch = mockFetch({
      '/api/tasks?status=pending': [],
      '/api/tasks?status=in_progress': [],
      '/api/tasks?status=done': [],
      '/api/tasks?status=failed': [],
      '/api/containers': [],
      '/api/repositories': [],
      '/api/logs': { lines: [], nextOffset: 0 },
    });

    const { result } = renderHook(() => useApi(60000));

    await waitFor(() => {
      expect(result.current.data.online).toBe(true);
    });

    const callsBefore = global.fetch.mock.calls.length;

    await act(async () => {
      await result.current.refresh();
    });

    expect(global.fetch.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
