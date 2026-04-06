import re

with open('components/EpgTimeline.tsx', 'r') as f:
    content = f.read()

# Replace:
#   const timelineStart = useMemo(() => {
#     const d = new Date(now);
#     d.setHours(d.getHours() - TIMELINE_START_OFFSET_HOURS);
#     // Align to full or half-hour markers (xx:00 / xx:30) for stable TV grid labels.
#     const minutes = d.getMinutes();
#     d.setMinutes(minutes < 30 ? 0 : 30, 0, 0);
#     return d;
#   }, [now, TIMELINE_START_OFFSET_HOURS]);

content = re.sub(
    r'const timelineStart = useMemo\(\(\) => \{[\s\S]*?return d;\n  \}, \[now, TIMELINE_START_OFFSET_HOURS\]\);',
    r'''const timelineStart = useMemo(() => {
    const d = new Date(now);
    d.setHours(d.getHours() - TIMELINE_START_OFFSET_HOURS);
    // Align to full or half-hour markers (xx:00 / xx:30) for stable TV grid labels.
    const minutes = d.getMinutes();
    d.setMinutes(minutes < 30 ? 0 : 30, 0, 0);
    return d;
  }, [now, TIMELINE_START_OFFSET_HOURS]);''',
    content
)

with open('components/EpgTimeline.tsx', 'w') as f:
    f.write(content)
