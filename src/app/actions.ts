"use server";

import { updateTag } from "next/cache";
import { RADAR_CACHE_TAG } from "@/lib/radar/get-radar";

/** Drops the cached snapshot so the next render re-scans every source. */
export async function refreshRadar() {
  updateTag(RADAR_CACHE_TAG);
}
