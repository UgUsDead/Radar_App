
import { normalizeBase } from './backend';

export async function submitIncidentResponse(apiBase: string, eventId: string, action: 'ack' | 'arrived' | 'resolve' | 'escalate', notes?: string) {
  const base = normalizeBase(apiBase);
  try {
    const res = await fetch(`${base}/events/${eventId}/${action === 'escalate' ? 'escalate' : action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor: "mobile_rapid_response", action_taken: action, notes })
    });
    return res.ok;
  } catch (e) {
    // Queue locally if offline (Feature 14)
    console.log("Network error, queuing offline action (mock)");
    return false;
  }
}
