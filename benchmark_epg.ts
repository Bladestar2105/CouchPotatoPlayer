import { performance } from 'perf_hooks';

// Simulate loading EPG data
const channels = 5000;
const programsPerChannel = 50;

const cachedEpg = {
  data: {} as Record<string, any[]>
};

const now = Date.now();
for (let i = 0; i < channels; i++) {
  const progs = [];
  for (let j = 0; j < programsPerChannel; j++) {
    progs.push({
      id: `prog_${i}_${j}`,
      title: `Program ${j}`,
      description: `Desc ${j}`,
      start: new Date(now + j * 3600000).toISOString(),
      end: new Date(now + (j + 1) * 3600000).toISOString(),
    });
  }
  cachedEpg.data[`chan_${i}`] = progs;
}

const start = performance.now();
const hydratedEpg: Record<string, any[]> = {};
for (const channelId in cachedEpg.data) {
  hydratedEpg[channelId] = cachedEpg.data[channelId].map((p: any) => ({
    ...p,
    start: new Date(p.start),
    end: new Date(p.end),
  }));
}
const end = performance.now();
console.log(`Baseline hydration time: ${end - start} ms`);

const startNum = performance.now();
const hydratedEpgNum: Record<string, any[]> = {};
for (const channelId in cachedEpg.data) {
  // If they were saved as numbers we wouldn't even need map!
  // But let's say they are ISO strings in cache and we convert to numbers
  hydratedEpgNum[channelId] = cachedEpg.data[channelId].map((p: any) => ({
    ...p,
    start: new Date(p.start).getTime(),
    end: new Date(p.end).getTime(),
  }));
}
const endNum = performance.now();
console.log(`To Numbers time: ${endNum - startNum} ms`);

// Or if we already have them as numbers in cache (from JSON), we don't need to parse at all!
const cachedEpgNum = {
  data: {} as Record<string, any[]>
};
for (let i = 0; i < channels; i++) {
  const progs = [];
  for (let j = 0; j < programsPerChannel; j++) {
    progs.push({
      id: `prog_${i}_${j}`,
      title: `Program ${j}`,
      description: `Desc ${j}`,
      start: now + j * 3600000,
      end: now + (j + 1) * 3600000,
    });
  }
  cachedEpgNum.data[`chan_${i}`] = progs;
}

const startNoMap = performance.now();
// We can just use it directly!
const hydratedEpgNoMap = cachedEpgNum.data;
const endNoMap = performance.now();
console.log(`No Map (Direct Numbers) time: ${endNoMap - startNoMap} ms`);
