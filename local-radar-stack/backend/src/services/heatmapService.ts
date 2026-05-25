import { Pool } from "pg";
import { logger } from "../logger.js";

export class HeatmapAggregationService {
  private buffer: Map<string, number> = new Map();
  private pool: Pool;
  private flushInterval: NodeJS.Timeout;

  constructor(pool: Pool) {
    this.pool = pool;
    // Flush every 1 minute
    this.flushInterval = setInterval(() => void this.flush(), 1 * 60 * 1000);
  }

  /**
   * Track time spent in a grid cell
   * @param patientId The patient ID
   * @param x The world X coordinate
   * @param y The world Y coordinate
   * @param seconds Duration in seconds (usually frame duration)
   */
  public track(ownerId: number, patientId: number, x: number, y: number, seconds: number) {
    if (!Number.isInteger(ownerId) || !patientId || isNaN(x) || isNaN(y)) return;

    // 25cm grid discretization
    const gridX = Math.floor(x / 0.25);
    const gridY = Math.floor(y / 0.25);

    // Key format: patientId:hour:gridX:gridY
    const hour = new Date();
    hour.setMinutes(0, 0, 0);
    const hourIso = hour.toISOString();
    
    const key = `${ownerId}|${patientId}|${hourIso}|${gridX}|${gridY}`;
    this.buffer.set(key, (this.buffer.get(key) ?? 0) + seconds);
  }

  public async flush() {
    if (this.buffer.size === 0) return;

    const snapshot = Array.from(this.buffer.entries());
    this.buffer.clear();

    logger.info({ count: snapshot.length }, "Flushing heatmap data to database");

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      
      for (const [key, seconds] of snapshot) {
        const [ownerIdStr, patientIdStr, hourIso, gridXStr, gridYStr] = key.split("|");
        const ownerId = parseInt(ownerIdStr);
        const patientId = parseInt(patientIdStr);
        const gridX = parseInt(gridXStr);
        const gridY = parseInt(gridYStr);

        await client.query(`
          INSERT INTO patient_spatial_stats (owner_id, patient_id, hour_timestamp, grid_x, grid_y, duration_seconds)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (patient_id, hour_timestamp, grid_x, grid_y)
          DO UPDATE SET duration_seconds = patient_spatial_stats.duration_seconds + EXCLUDED.duration_seconds
        `, [ownerId, patientId, hourIso, gridX, gridY, Math.round(seconds)]);
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error({ err }, "Failed to flush heatmap data");
      // Restore snapshot to buffer so we don't lose data
      snapshot.forEach(([k, v]) => {
        this.buffer.set(k, (this.buffer.get(k) ?? 0) + v);
      });
    } finally {
      client.release();
    }
  }

  public stop() {
    clearInterval(this.flushInterval);
  }
}
