export type MonitorHealth = {
  queueDepth: { events: number; summaries: number };
  flush: {
    lastFlushDurationMs: number;
    lastFlushAt: string | null;
    lastFlushEventCount: number;
    lastFlushSummaryCount: number;
    totalFlushes: number;
    totalFlushedEvents: number;
    totalFlushedSummaries: number;
  };
  heartbeat: {
    online: number;
    offline: number;
    total: number;
    oldestLastSeenSeconds: number | null;
    newestLastSeenSeconds: number | null;
  };
  messageRates: {
    totalMessages: number;
    totalBytes: number;
    msgsPerSecond: number;
    bytesPerSecond: number;
  };
  ingestLag: Array<{ radarId: string; latestMs: number; averageMs: number; maxMs: number; samples: number }>;
  generatedAt: string;
};
