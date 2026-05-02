const DATA_CHANGED_EVENT = 'caixinha:data-changed';

export function subscribe<T>(loader: () => Promise<T>, callback: (value: T) => void, intervalMs = 60000) {
  let stopped = false;
  let loading = false;
  const load = async () => {
    if (stopped || loading) return;
    loading = true;
    try {
      callback(await loader());
    } catch (error) {
      console.error('Subscription refresh failed:', error);
    } finally {
      loading = false;
    }
  };
  load();
  const interval = window.setInterval(load, intervalMs);
  window.addEventListener(DATA_CHANGED_EVENT, load);
  return () => {
    stopped = true;
    window.clearInterval(interval);
    window.removeEventListener(DATA_CHANGED_EVENT, load);
  };
}

export function notifyDataChanged() {
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}
