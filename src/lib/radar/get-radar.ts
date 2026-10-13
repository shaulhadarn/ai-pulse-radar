import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { buildSnapshot } from "./snapshot";
import { ALL_SOURCES } from "./sources";

export const RADAR_CACHE_TAG = "radar";

/** Cached radar snapshot, refreshed in the background per the `radar` cache profile. */
export async function getRadarSnapshot() {
  "use cache";
  cacheLife("radar");
  cacheTag(RADAR_CACHE_TAG);
  return buildSnapshot(ALL_SOURCES);
}
