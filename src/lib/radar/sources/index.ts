import type { SourceAdapter } from "../types";
import { githubSource } from "./github";
import { hackerNewsSource } from "./hackernews";
import { redditSource } from "./reddit";
import { xSource } from "./x";

/** Add a new platform by writing a SourceAdapter and listing it here. */
export const ALL_SOURCES: SourceAdapter[] = [xSource, hackerNewsSource, redditSource, githubSource];
