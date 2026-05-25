import { logger } from "../logger.js";

const DEFAULT_DEV_SECRET = "default_development_secret";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret;
  }

  logger.warn("JWT_SECRET is not configured; using default development secret");
  return DEFAULT_DEV_SECRET;
}
