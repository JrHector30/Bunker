// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCache } from './useCache';

vi.mock('../utils/auditLogger', () => ({
  logStateChange: vi.fn()
}));

describe('useCache React Hook Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Scenario 1: A late response from key A never overwrites key B', async () => {
    let resolveA;
    const fetcherA = () => new Promise(r => { resolveA = r; });
    const fetcherB = async () => ({ value: 'B' });

    const { result, rerender } = renderHook(({ key, fetcher }) => useCache(key, fetcher), {
      initialProps: { key: 'scenario1_keyA', fetcher: fetcherA }
    });

    // Switch key to keyB before keyA resolves
    rerender({ key: 'scenario1_keyB', fetcher: fetcherB });

    // Wait for keyB's fetcher to finish
    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    expect(result.current.data).toEqual({ value: 'B' });

    // Now resolve keyA
    await act(async () => {
      resolveA({ value: 'A' });
      await new Promise(r => setTimeout(r, 20));
    });

    // Verify keyB was not overwritten by late keyA resolution
    expect(result.current.data).toEqual({ value: 'B' });
  });

  it('Scenario 2: Fast page/key changes do not leak stale data', async () => {
    const fetcher1 = async () => ({ val: 1 });
    const fetcher2 = async () => ({ val: 2 });
    const fetcher3 = async () => ({ val: 3 });

    const { result, rerender } = renderHook(({ key, fetcher }) => useCache(key, fetcher), {
      initialProps: { key: 'scenario2_page1', fetcher: fetcher1 }
    });

    // Rerender rapidly with different keys
    rerender({ key: 'scenario2_page2', fetcher: fetcher2 });
    rerender({ key: 'scenario2_page3', fetcher: fetcher3 });

    // Since page3 has no cache yet, it should immediately reset to initialData ([])
    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    expect(result.current.data).toEqual({ val: 3 });
    expect(result.current.loading).toBe(false);
  });

  it('Scenario 3: Out-of-order responses apply the latest fetcher assignment', async () => {
    let resolve1;
    let resolve2;
    const fetcher1 = () => new Promise(r => { resolve1 = r; });
    const fetcher2 = () => new Promise(r => { resolve2 = r; });

    const { result, rerender } = renderHook(({ key, fetcher }) => useCache(key, fetcher), {
      initialProps: { key: 'scenario3_key', fetcher: fetcher1 }
    });

    // Trigger Mutate 1 under fetcher1
    let p1;
    act(() => {
      p1 = result.current.mutate();
    });

    // Change fetcher to fetcher2
    rerender({ key: 'scenario3_key', fetcher: fetcher2 });

    // Trigger Mutate 2 under fetcher2
    let p2;
    act(() => {
      p2 = result.current.mutate();
    });

    // Resolve second request first (version 2)
    await act(async () => {
      resolve2({ version: 2 });
      await p2;
    });

    expect(result.current.data).toEqual({ version: 2 });

    // Resolve first request late (version 1)
    await act(async () => {
      resolve1({ version: 1 });
      try {
        await p1;
      } catch (err) { /* ignore */ }
    });

    // Verify it did not overwrite the newer result
    expect(result.current.data).toEqual({ version: 2 });
  });

  it('Scenario 4: Dismounting during a fetch prevents memory updates', async () => {
    let resolveFetch;
    const fetcher = () => new Promise(r => { resolveFetch = r; });

    const { result, unmount } = renderHook(() => useCache('scenario4_key', fetcher));

    // Unmount component
    unmount();

    // Resolve the fetcher
    await act(async () => {
      resolveFetch({ result: 'ok' });
      await new Promise(r => setTimeout(r, 20));
    });

    // LocalStorage should not have been updated since effect was cancelled
    expect(localStorage.getItem('scenario4_key')).toBeNull();
  });

  it('Scenario 5: Network failure preserves previous cache data strictly by key', async () => {
    localStorage.setItem('scenario5_key', JSON.stringify({ previous: 'data' }));

    const fetcherFails = () => Promise.reject(new Error('500 Internal Error'));

    const { result } = renderHook(() => useCache('scenario5_key', fetcherFails));

    // Initial state should load from cache
    expect(result.current.data).toEqual({ previous: 'data' });

    await act(async () => {
      await new Promise(r => setTimeout(r, 20));
    });

    // After failure, data should remain unchanged
    expect(result.current.data).toEqual({ previous: 'data' });
  });

  it('Scenario 6: Consecutive manualMutate calls are handled atomically', async () => {
    let counter = 0;
    const fetcher = async () => ({ count: ++counter });

    const { result } = renderHook(() => useCache('scenario6_key', fetcher));

    // 1 count from mount effect, then 3 mutate calls = 4 final count
    await act(async () => {
      const p1 = result.current.mutate();
      const p2 = result.current.mutate();
      const p3 = result.current.mutate();
      await Promise.all([p1, p2, p3]);
    });

    expect(result.current.data).toEqual({ count: 4 });
    expect(result.current.loading).toBe(false);
  });
});
