import { performance } from 'perf_hooks';

// Simulate channels and groups
const numGroups = 1000;
const channelsPerGroup = 10;
const groups = [];
const groupMap = {};

for (let i = 0; i < numGroups; i++) {
  const title = `Group ${i}`;
  const data = Array.from({ length: channelsPerGroup }, (_, j) => ({ id: `id_${i}_${j}` }));
  groups.push({ title, data });
  groupMap[title] = data;
}

const targetGroup = `Group ${numGroups - 1}`; // Worst case for find

// Measure array find
const startFind = performance.now();
for (let i = 0; i < 10000; i++) {
  const currentChannels = groups.find(g => g.title === targetGroup)?.data || [];
}
const endFind = performance.now();

// Measure map lookup
const startMap = performance.now();
for (let i = 0; i < 10000; i++) {
  const currentChannels = groupMap[targetGroup] || [];
}
const endMap = performance.now();

console.log(`Array find: ${endFind - startFind} ms`);
console.log(`Map lookup: ${endMap - startMap} ms`);
