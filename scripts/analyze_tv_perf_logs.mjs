#!/usr/bin/env node

import fs from 'node:fs';

const USAGE = `
Usage:
  node scripts/analyze_tv_perf_logs.mjs <log-file>
  cat tv.log | node scripts/analyze_tv_perf_logs.mjs

Parses lines like:
  [TVPerf] ChannelList.buildGroups: 12.4ms
  [TVPerf] MovieList.groupSelectToFocus: 88ms {"selectedGroup":"Drama"}
`;

const parseInput = () => {
  const fileArg = process.argv[2];
  if (fileArg && ['-h', '--help'].includes(fileArg)) {
    console.log(USAGE.trim());
    process.exit(0);
  }

  if (fileArg) {
    if (!fs.existsSync(fileArg)) {
      console.error(`[tv-perf] File not found: ${fileArg}`);
      process.exit(1);
    }
    return fs.readFileSync(fileArg, 'utf8');
  }

  try {
    const stdin = fs.readFileSync(0, 'utf8');
    if (!stdin || stdin.trim().length === 0) {
      console.error('[tv-perf] No input received.');
      console.error(USAGE.trim());
      process.exit(1);
    }
    return stdin;
  } catch {
    console.error('[tv-perf] Failed to read input.');
    console.error(USAGE.trim());
    process.exit(1);
  }
};

const percentile = (sortedValues, p) => {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  const rank = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sortedValues[lower];
  const weight = rank - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
};

const summarize = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  return {
    count,
    min: sorted[0],
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    max: sorted[sorted.length - 1],
    avg: sum / count,
  };
};

const formatMs = (value) => `${(Math.round(value * 10) / 10).toFixed(1)}ms`;

const input = parseInput();
const lines = input.split(/\r?\n/);
const metricMap = new Map();

const tvPerfRegex = /\[TVPerf\]\s+([A-Za-z0-9_.-]+):\s*([0-9]+(?:\.[0-9]+)?)ms\b/;

for (const line of lines) {
  const match = line.match(tvPerfRegex);
  if (!match) continue;
  const metricName = match[1];
  const duration = Number(match[2]);
  if (!Number.isFinite(duration)) continue;
  if (!metricMap.has(metricName)) {
    metricMap.set(metricName, []);
  }
  metricMap.get(metricName).push(duration);
}

if (metricMap.size === 0) {
  console.error('[tv-perf] No [TVPerf] metrics found.');
  process.exit(1);
}

const metricNames = Array.from(metricMap.keys()).sort();
console.log('TV Performance Summary');
console.log('======================');
for (const name of metricNames) {
  const summary = summarize(metricMap.get(name));
  console.log(
    `${name}\n` +
      `  n=${summary.count} min=${formatMs(summary.min)} p50=${formatMs(summary.p50)} p95=${formatMs(summary.p95)} avg=${formatMs(summary.avg)} max=${formatMs(summary.max)}`
  );
}
