import posthog from "posthog-js";

const PH_KEY = import.meta.env.VITE_POSTHOG_KEY;
const PH_HOST = import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export function initAnalytics() {
  if (!PH_KEY) return;
  posthog.init(PH_KEY, {
    api_host: PH_HOST,
    person_profiles: "identified_only",
    capture_pageview: true,
    autocapture: false,
  });
}

export function track(event, props) {
  if (!PH_KEY) return;
  posthog.capture(event, props);
}
