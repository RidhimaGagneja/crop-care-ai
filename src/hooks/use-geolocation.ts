import { useEffect, useState } from "react";

export type GeoStatus = "idle" | "locating" | "granted" | "denied" | "unsupported" | "error";

export interface GeoState {
  lat?: number;
  lng?: number;
  status: GeoStatus;
}

/**
 * Requests the browser's geolocation once on mount.
 *
 * This is deliberately "fire and forget, never block": every failure mode
 * (no Geolocation API, user denies the permission prompt, GPS times out,
 * insecure context) just leaves `lat`/`lng` undefined, and callers should
 * fall back to the backend's default demo location in that case — same
 * behaviour as before this hook existed, just now upgraded to the real
 * location when the browser grants it.
 *
 * Note: browsers require a secure context (HTTPS) for geolocation in
 * production; `localhost` is exempted, so this works fine in local dev
 * without HTTPS.
 */
export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "unsupported" });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, status: "locating" }));

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) setState((s) => (s.status === "locating" ? { status: "error" } : s));
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timeoutId);
        if (cancelled) return;
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          status: "granted",
        });
      },
      () => {
        window.clearTimeout(timeoutId);
        if (!cancelled) setState({ status: "denied" });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  return state;
}
