import type { ExtensionTheme } from "@oh-my-pi/pi-coding-agent";

export function renderCall(label: string, pick: (args: Record<string, unknown>) => string | undefined = () => undefined) {
  return (rawArgs: unknown, _options: unknown, theme: ExtensionTheme): string => {
    const suffix = pick((rawArgs ?? {}) as Record<string, unknown>);
    return `${theme.fg("toolTitle", theme.bold(`${label} `))}${suffix ? theme.fg("accent", suffix) : ""}`;
  };
}

export function renderResult(label: string) {
  return (result: { details?: Record<string, unknown> }, _options: unknown, theme: ExtensionTheme): string => {
    const details = result.details ?? {};
    const args = details.args as Record<string, unknown> | undefined;
    const data = details.data as Record<string, unknown> | undefined;
    const bits: string[] = [theme.fg("success", `✓ ${label}`)];
    if (args?.project) bits.push(theme.fg("muted", `project=${String(args.project)}`));
    const total = typeof data?.total === "number" ? data.total : undefined;
    if (total !== undefined) bits.push(theme.fg("muted", `total=${total}`));
    else if (typeof data?.returned === "number") bits.push(theme.fg("muted", `returned=${data.returned}`));
    const hasMore = data?.has_more === true || data?.truncated === true;
    if (hasMore) bits.push(theme.fg("warning", "has_more"));
    if (details.fullOutputPath) bits.push(theme.fg("warning", `full=${String(details.fullOutputPath)}`));
    if (details.uncompactedOutputPath) bits.push(theme.fg("warning", `uncompacted=${String(details.uncompactedOutputPath)}`));
    return bits.join(" ");
  };
}
