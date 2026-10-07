// Only page locations are needed; query strings and fragments can contain learner input.
export function redactAnalyticsUrl(event) {
  try {
    const url = new URL(event.url);
    return { ...event, url: `${url.origin}${url.pathname}` };
  } catch {
    return null;
  }
}
