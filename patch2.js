const fs = require('fs');
let content = fs.readFileSync('components/EpgTimeline.tsx', 'utf8');

// Fix the missing dependencies in useMemo for programLayoutData
content = content.replace(
  "}, [programs, timelineStart, timelineEnd, now, PIXELS_PER_MINUTE]);",
  "}, [programs, timelineStart, timelineEnd, now, PIXELS_PER_MINUTE, scrollX, visibleWidth]);"
);

// Remove the unnecessary useMemo for TIMELINE_DURATION_HOURS
content = content.replace(
  `  const TIMELINE_DURATION_HOURS = useMemo(() => {
     // Timeline is start offset + 24 hours into the future
     return TIMELINE_START_OFFSET_HOURS + 24;
  }, [TIMELINE_START_OFFSET_HOURS]);`,
  `  // Timeline is start offset + 24 hours into the future
  const TIMELINE_DURATION_HOURS = TIMELINE_START_OFFSET_HOURS + 24;`
);

fs.writeFileSync('components/EpgTimeline.tsx', content);
