import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatSize } from "../shared/strings.js";
import type { CbmData } from "./normalize.js";

// Oh My Pi's truncation helpers live in a module that loads its native addon at
// import time (Bun-only), so keep the same limits here.
const MAX_OUTPUT_LINES = 2_000;
const MAX_OUTPUT_BYTES = 50 * 1024;

type Truncation = {
  content: string;
  truncated: boolean;
  totalLines: number;
  totalBytes: number;
  outputLines: number;
  outputBytes: number;
};

function truncateHead(content: string): Truncation {
  const totalBytes = Buffer.byteLength(content, "utf8");
  const lines = content.split("\n");
  const totalLines = lines.length;
  if (totalLines <= MAX_OUTPUT_LINES && totalBytes <= MAX_OUTPUT_BYTES) {
    return { content, truncated: false, totalLines, totalBytes, outputLines: totalLines, outputBytes: totalBytes };
  }

  const kept: string[] = [];
  let bytes = 0;
  for (const line of lines) {
    if (kept.length >= MAX_OUTPUT_LINES) break;
    const next = bytes + Buffer.byteLength(line, "utf8") + (kept.length > 0 ? 1 : 0);
    if (next > MAX_OUTPUT_BYTES) break;
    kept.push(line);
    bytes = next;
  }
  return { content: kept.join("\n"), truncated: true, totalLines, totalBytes, outputLines: kept.length, outputBytes: bytes };
}

export type CbmCallOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
  allowError?: boolean;
};

export type CbmCallResult = {
  ok: boolean;
  data: CbmData;
  rawText: string;
  stderr: string;
};

export type ToolTextResult = {
  content: [{ type: "text"; text: string }];
  details: Record<string, unknown>;
};

export async function buildToolTextResult(title: string, data: unknown, details: Record<string, unknown> = {}): Promise<ToolTextResult> {
  const json = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const truncation = truncateHead(json);

  let text = `${title}\n\n${truncation.content}`;
  const resultDetails: Record<string, unknown> = { ...details, data };

  if (typeof resultDetails.uncompactedOutputPath === "string") {
    text += `\n\n[Large code blocks were compacted. Full un-compacted output saved to: ${resultDetails.uncompactedOutputPath}. Rerun with full_output=true or increase max_symbol_lines to include more in the response.]`;
  }

  if (truncation.truncated) {
    const dir = await mkdtemp(join(tmpdir(), "cbm-"));
    const path = join(dir, "result.json");
    await writeFile(path, json, "utf8");
    resultDetails.fullOutputPath = path;
    resultDetails.truncation = truncation;
    text += `\n\n[Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(
      truncation.outputBytes ?? 0,
    )} of ${formatSize(truncation.totalBytes)}). Full output saved to: ${path}]`;
  }

  return { content: [{ type: "text", text }], details: resultDetails };
}

export async function saveJsonResult(data: unknown, filename = "result.full.json"): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "cbm-"));
  const path = join(dir, filename);
  await writeFile(path, typeof data === "string" ? data : JSON.stringify(data, null, 2), "utf8");
  return path;
}
