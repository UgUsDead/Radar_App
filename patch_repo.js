const fs = require('fs');
const code = fs.readFileSync('/home/hugo/Desktop/BLE2/local-radar-stack/backend/src/db/repository.ts', 'utf8');
const newCode = code.replace(
  /public async updateEventAlertStatus\([\s\S]*?return \(result\.rowCount \?\? 0\) > 0;\n  \}/m,
  `public async updateEventAlertStatus(
    eventId: number,
    status: "acknowledged" | "resolved" | "closed",
    actor?: string,
    options?: { notes?: string; outcome?: string; action_taken?: string; escalation_level?: string }
  ): Promise<boolean> {
    const actorValue = actor?.trim() || "dashboard";
    const timestampKey = status === "resolved" ? "resolved_at" : status === "closed" ? "closed_at" : "acknowledged_at";
    
    let extraJson = {};
    if (options?.notes) extraJson.closure_notes = options.notes;
    if (options?.outcome) extraJson.outcome = options.outcome;
    if (options?.action_taken) extraJson.action_taken = options.action_taken;
    if (options?.escalation_level) extraJson.escalation_level = options.escalation_level;

    const result = await this.pool.query(
      \`UPDATE events
       SET metadata =
         COALESCE(metadata, '{}'::jsonb) ||
         jsonb_build_object(
           'alert_status', $2::text,
           'last_updated_by', $3::text,
           '\${timestampKey}', NOW()::text
         ) || $4::jsonb
       WHERE id = $1\`,
      [eventId, status, actorValue, extraJson]
    );
    return (result.rowCount ?? 0) > 0;
  }`
);
fs.writeFileSync('/home/hugo/Desktop/BLE2/local-radar-stack/backend/src/db/repository.ts', newCode);
