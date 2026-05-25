import { apiFetch } from "../utils/api";
import { useState, useEffect, useCallback, MutableRefObject } from "react";
import { Radar, RoomRow, Patient, EventRow, DailyRow, WatchlistRow } from "../types/domain";
import { MonitorHealth } from "../types/health";
import { apiBase } from "../constants/api";

export function useDashboardData(interactingRef: MutableRefObject<boolean>) {
  const [allRadars, setAllRadars] = useState<Radar[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [monitorHealth, setMonitorHealth] = useState<MonitorHealth | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    try {
      setError("");
      const [radarsData, roomsData, patientsData, eventsData, dailyData] = await Promise.all([
        apiFetch(`/radars`).then((r) => r.ok ? r.json() : Promise.reject(new Error("API Error"))),
        apiFetch(`/rooms`).then((r) => r.ok ? r.json() : Promise.reject(new Error("API Error"))),
        apiFetch(`/patients`).then((r) => r.ok ? r.json() : Promise.reject(new Error("API Error"))),
        apiFetch(`/events?limit=20`).then((r) => r.ok ? r.json() : Promise.reject(new Error("API Error"))),
        apiFetch(`/daily_stats?days=1`).then((r) => r.ok ? r.json() : Promise.reject(new Error("API Error")))
      ]);

      let watchlistData: WatchlistRow[] = [];
      try {
        const watchlistResponse = await apiFetch(`/monitor/watchlist`);
        if (watchlistResponse.ok) {
          const payload = (await watchlistResponse.json()) as { watchlist?: WatchlistRow[] };
          watchlistData = Array.isArray(payload.watchlist) ? payload.watchlist : [];
        }
      } catch {
        watchlistData = [];
      }

      let healthData: MonitorHealth | null = null;
      try {
        const healthRes = await apiFetch(`/monitor/health`);
        if (healthRes.ok) {
          healthData = (await healthRes.json()) as MonitorHealth;
        }
      } catch {
        healthData = null;
      }

      setAllRadars(radarsData);
      setRooms(roomsData);
      setPatients(patientsData);
      setEvents(eventsData);
      setDaily(dailyData);
      setMonitorHealth(healthData);
      setWatchlist(watchlistData);
      setLastUpdated(new Date());
    } catch {
      setError("Não foi possível carregar os dados de monitorização. Verifique a ligação ao servidor.");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      // Skip auto-refresh while user is actively interacting with management controls
      if (interactingRef.current) return;
      void load();
    }, 2_000);

    let sse: EventSource | null = null;
    let retryCount = 0;
    
    const connectSSE = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("radar_auth_token") : null;
      const url = `${apiBase}/monitor/stream${token ? `?token=${token}` : ""}`;
      sse = new EventSource(url);
      
      sse.addEventListener("alert", (e) => {
        try {
          const newEvent = JSON.parse(e.data);
          setEvents((prev) => {
            if (prev.some(ev => ev.id === newEvent.id)) return prev;
            return [newEvent, ...prev].slice(0, 20);
          });
        } catch (err) {
          console.error("Failed to parse real-time alert", err);
        }
      });

      sse.addEventListener("open", () => {
        retryCount = 0;
      });

      sse.addEventListener("error", () => {
        if (sse) sse.close();
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
        retryCount++;
        setTimeout(connectSSE, backoffMs);
      });
    };
    
    connectSSE();

    return () => {
      clearInterval(timer);
      if (sse) sse.close();
    };
  }, [load, interactingRef]);

  const updateRiskProfile = useCallback(async (patientId: number, riskProfile: any) => {
    try {
      const res = await apiFetch(`/patients/${patientId}/risk-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskProfile })
      });
      if (!res.ok) throw new Error("Failed to update risk profile");
      await load();
    } catch (err) {
      console.error(err);
      setError("Falha ao atualizar perfil de risco.");
    }
  }, [load]);

  return {
    allRadars,
    rooms,
    patients,
    events,
    daily,
    monitorHealth,
    watchlist,
    lastUpdated,
    error,
    load,
    updateRiskProfile
  };
}
