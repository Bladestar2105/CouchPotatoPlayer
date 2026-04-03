const fs = require('fs');
const content = fs.readFileSync('components/EpgTimeline.tsx', 'utf8');

let newContent = content.replace(
  "import { isProgramCatchupAvailable } from '../utils/catchupUtils';",
  "import { isProgramCatchupAvailable, getCatchupDays } from '../utils/catchupUtils';"
);

newContent = newContent.replace(
  "const TIMELINE_START_OFFSET_HOURS = 2; // Show x hours before now\nconst TIMELINE_DURATION_HOURS = 24; // Total hours in timeline",
  ""
);

newContent = newContent.replace(
  "const EpgRow = React.memo(({ channel, programs, isFocused, isPlaying, isFav, colors, focusedChannelId, setFocusedChannelId, onChannelPress, onProgramPress, addFavorite, removeFavorite, timelineStart, timelineEnd, now, PIXELS_PER_MINUTE, hasTVPreferredFocus, hasCatchup }: any) => {",
  `const EpgRow = React.memo(({ channel, programs, isFocused, isPlaying, isFav, colors, focusedChannelId, setFocusedChannelId, onChannelPress, onProgramPress, addFavorite, removeFavorite, timelineStart, timelineEnd, now, PIXELS_PER_MINUTE, hasTVPreferredFocus, hasCatchup, scrollX, visibleWidth }: any) => {`
);

newContent = newContent.replace(
  "        const channelHasCatchup = hasCatchup ? hasCatchup(channel) : false;",
  `        const channelHasCatchup = hasCatchup ? hasCatchup(channel) : false;

        // Calculate visible time window based on scroll position with a generous buffer
        const visibleStartMs = timelineStart.getTime() + (Math.max(0, scrollX - 1000) / PIXELS_PER_MINUTE) * 60000;
        const visibleEndMs = timelineStart.getTime() + ((scrollX + visibleWidth + 1000) / PIXELS_PER_MINUTE) * 60000;
`
);

newContent = newContent.replace(
  `            const renderStartMs = Math.max(startMs, timelineStartMs);
            const renderEndMs = Math.min(endMs, timelineEndMs);

            const isProg_Now = nowMs >= startMs && nowMs < endMs;
            const isProg_Past = nowMs >= endMs;
            result.push({`,
  `            // Only render blocks that are within our visible window (with buffer)
            if (endMs < visibleStartMs || startMs > visibleEndMs) {
                continue;
            }

            const renderStartMs = Math.max(startMs, timelineStartMs);
            const renderEndMs = Math.min(endMs, timelineEndMs);

            const isProg_Now = nowMs >= startMs && nowMs < endMs;
            const isProg_Past = nowMs >= endMs;
            result.push({`
);

newContent = newContent.replace(
  "  const { epg, hasCatchup, getCatchupUrl, isFavorite, addFavorite, removeFavorite } = useIPTV();",
  `  const { epg, hasCatchup, getCatchupUrl, isFavorite, addFavorite, removeFavorite } = useIPTV();

  const [scrollX, setScrollX] = useState(0);
  const [visibleWidth, setVisibleWidth] = useState(1000);
  const mainScrollViewRef = useRef<ScrollView>(null);

  // Calculate max catchup days across all visible channels
  const maxCatchupDays = useMemo(() => {
    let max = 0;
    for (const channel of channels) {
      if (hasCatchup && hasCatchup(channel)) {
         max = Math.max(max, getCatchupDays(channel));
      }
    }
    return max;
  }, [channels, hasCatchup]);

  const TIMELINE_START_OFFSET_HOURS = useMemo(() => {
    // Show either 2 hours before now (default) or max catchup days available
    return Math.max(2, maxCatchupDays * 24);
  }, [maxCatchupDays]);

  const TIMELINE_DURATION_HOURS = useMemo(() => {
     // Timeline is start offset + 24 hours into the future
     return TIMELINE_START_OFFSET_HOURS + 24;
  }, [TIMELINE_START_OFFSET_HOURS]);
`
);

newContent = newContent.replace(
  "  const totalWidth = TIMELINE_DURATION_HOURS * HOUR_WIDTH;",
  `  const totalWidth = TIMELINE_DURATION_HOURS * HOUR_WIDTH;`
);

newContent = newContent.replace(
  `  // Scroll to current time on mount
  useEffect(() => {
    if (scrollViewRef.current && nowPosition > 100) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: nowPosition - 100, animated: false });
      }, 100);
    }
  }, [nowPosition]);`,
  `  // Scroll to current time on mount
  useEffect(() => {
    const targetX = Math.max(0, nowPosition - (visibleWidth / 2));
    if (scrollViewRef.current && targetX > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: targetX, animated: false });
        mainScrollViewRef.current?.scrollTo({ x: targetX, animated: false });
        setScrollX(targetX);
      }, 100);
    }
  }, [nowPosition, visibleWidth]);`
);


newContent = newContent.replace(
  `      <View style={{ flex: 1 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true} onScroll={(e) => {
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
            }
        }} scrollEventThrottle={16}>
          <View style={{ width: totalWidth + (Platform.isTV ? 160 : 120) }}>`,
  `      <View style={{ flex: 1 }} onLayout={(e) => setVisibleWidth(e.nativeEvent.layout.width)}>
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            ref={mainScrollViewRef}
            onScroll={(e) => {
                const newScrollX = e.nativeEvent.contentOffset.x;
                if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({ x: newScrollX, animated: false });
                }
                // Debounce state updates to avoid excessive re-renders during smooth scrolling
                if (Math.abs(scrollX - newScrollX) > 500) {
                   setScrollX(newScrollX);
                }
            }}
            scrollEventThrottle={16}
        >
          <View style={{ width: totalWidth + (Platform.isTV ? 160 : 120) }}>`
);

newContent = newContent.replace(
  `                            PIXELS_PER_MINUTE={PIXELS_PER_MINUTE}
                            hasTVPreferredFocus={shouldFocusFirstItem && index === 0}
                            hasCatchup={hasCatchup}
                        />`,
  `                            PIXELS_PER_MINUTE={PIXELS_PER_MINUTE}
                            hasTVPreferredFocus={shouldFocusFirstItem && index === 0}
                            hasCatchup={hasCatchup}
                            scrollX={scrollX}
                            visibleWidth={visibleWidth}
                        />`
);

newContent = newContent.replace(
  `           prevProps.isFav === nextProps.isFav &&
           prevProps.programs === nextProps.programs &&
           prevProps.channel === nextProps.channel;`,
  `           prevProps.isFav === nextProps.isFav &&
           prevProps.programs === nextProps.programs &&
           prevProps.channel === nextProps.channel &&
           prevProps.scrollX === nextProps.scrollX &&
           prevProps.visibleWidth === nextProps.visibleWidth;`
)

fs.writeFileSync('components/EpgTimeline.tsx', newContent);
