const DATA_CHANGED_EVENT = 'caixinha:data-changed';
const DEFAULT_REFRESH_INTERVAL_MS = 120000;

export function subscribe<T>(
  loader: () => Promise<T>,
  callback: (value: T) => void,
  intervalMs = DEFAULT_REFRESH_INTERVAL_MS,
  topics: string[] = ['*'],
) {
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
  const onDataChanged = (event: Event) => {
    const topic = event instanceof CustomEvent ? event.detail?.topic : '*';
    if (matchesTopic(topic, topics)) load();
  };
  window.addEventListener(DATA_CHANGED_EVENT, onDataChanged);
  return () => {
    stopped = true;
    window.clearInterval(interval);
    window.removeEventListener(DATA_CHANGED_EVENT, onDataChanged);
  };
}

export function notifyDataChanged(topic = '*') {
  window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT, { detail: { topic } }));
}

export function matchesTopic(topic: string, topics: string[]) {
  return topic === '*' || topics.includes('*') || topics.includes(topic);
}
