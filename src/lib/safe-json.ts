export type SafeJsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export function safeJsonParse(input: string): SafeJsonParseResult {
  try {
    const value: unknown = JSON.parse(input);
    return { ok: true, value };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
}


