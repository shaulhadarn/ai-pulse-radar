import { getRadarSnapshot } from "@/lib/radar/get-radar";

/** JSON feed of the current snapshot, for scripts, digests or other apps. */
export async function GET() {
  return Response.json(await getRadarSnapshot());
}
