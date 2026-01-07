export type SafeJsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export function safeJsonParse(input: string): SafeJsonParseResult {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value = JSON.parse(input);
    return { ok: true, value };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
}


