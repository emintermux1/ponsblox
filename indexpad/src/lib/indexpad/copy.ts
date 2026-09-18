/**
 * Empty-state preview copy only. Adapters never return this as live data.
 * Example composition: $AAA 40% $BBB 30% $CCC 20% $DDD 10%
 */
export const EXAMPLE_INDEX_LABEL = "example";

export const EXAMPLE_INDEX_COMPOSITION_COPY = "$AAA 40% $BBB 30% $CCC 20% $DDD 10%";

export const EXAMPLE_INDEX_BLURB =
  `Preview only (${EXAMPLE_INDEX_LABEL}): ${EXAMPLE_INDEX_COMPOSITION_COPY}. No live index rows until INDEXPAD_API_BASE is configured.`;
