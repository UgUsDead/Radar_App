const fs = require('fs');
let code = fs.readFileSync('/home/hugo/Desktop/BLE2/local-radar-stack/backend/src/index.ts', 'utf8');

code = code.replace(
  `const eventActionSchema = z.object({
  actor: z.string().min(1).optional()
});`,
  `const eventActionSchema = z.object({
  actor: z.string().min(1).optional(),
  notes: z.string().optional(),
  outcome: z.string().optional(),
  action_taken: z.string().optional()
});`
);

code = code.replace(
  `    const ok = await repository.updateEventAlertStatus(id, "acknowledged", parsed.data.actor);`,
  `    const ok = await repository.updateEventAlertStatus(id, "acknowledged", parsed.data.actor, parsed.data);`
);

code = code.replace(
  `    const ok = await repository.updateEventAlertStatus(id, "resolved", parsed.data.actor);`,
  `    const ok = await repository.updateEventAlertStatus(id, "resolved", parsed.data.actor, parsed.data);`
);

code = code.replace(
  `  app.get("/daily_stats", async (req, res) => {`,
  `  app.post("/events/:id/close", async (req, res) => {
    const id = Number(req.params.id);
    const parsed = eventActionSchema.safeParse(req.body ?? {});
    if (!Number.isInteger(id) || !parsed.success) {
      res.status(400).json({ error: "Invalid event close request" });
      return;
    }
    const ok = await repository.updateEventAlertStatus(id, "closed", parsed.data.actor, parsed.data);
    if (!ok) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json({ ok: true });
  });

  app.get("/daily_stats", async (req, res) => {`
);

// Add escalation background job timer in main
code = code.replace(
  `  rateMonitor.start();\n  await mqttClient.start();\n`,
  `  rateMonitor.start();\n  await mqttClient.start();\n
  const escalationBackgroundJob = setInterval(async () => {
    try {
      const activeEvents = await repository.getEvents(100);
      for (const e of activeEvents as any[]) {
        const alertStatus = e.alert_status ?? "new";
        if (alertStatus === "resolved" || alertStatus === "closed") continue;

        const acknowledgedAt = e.metadata?.acknowledged_at;
        const currentEscalation = e.metadata?.escalation_level ?? "new";
        const newEscalation = escalationService.determineEscalationLevel(
          e.timestamp,
          new Date(),
          alertStatus === "acknowledged" ? acknowledgedAt : undefined
        );

        if (newEscalation !== currentEscalation && newEscalation !== "new") {
          await repository.updateEventAlertStatus(e.id, alertStatus, "system-escalation", {
            escalation_level: newEscalation
          });
          logger.info({ eventId: e.id, newEscalation }, "Escalated event automatically");
        }
      }
    } catch (err) {
      logger.error({ err }, "Failed during escalation background job");
    }
  }, 60 * 1000);
`
);

code = code.replace(
  `    clearInterval(flushTimer);`,
  `    clearInterval(escalationBackgroundJob);\n    clearInterval(flushTimer);`
);

fs.writeFileSync('/home/hugo/Desktop/BLE2/local-radar-stack/backend/src/index.ts', code);
