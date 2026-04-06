import re

with open('screens/PlayerScreen.tsx', 'r') as f:
    content = f.read()

# Replace:
#   const playbackTitle = useMemo(() => {
#     const stream = currentStream as any;
#     if (stream?.name && typeof stream.name === 'string') return stream.name;
#     if (currentProgram?.title) return currentProgram.title;
#     if (currentChannel?.name) return currentChannel.name;
#     if (route.params?.title && typeof route.params.title === 'string') return route.params.title;
#     return t('nowPlaying');
#   }, [currentStream, currentProgram?.title, currentChannel?.name, t]);

replacement = """  const playbackTitle = useMemo(() => {
    const stream = currentStream as any;
    if (route.params?.title && typeof route.params.title === 'string') return route.params.title;
    if (stream?.name && typeof stream.name === 'string') return stream.name;
    if (currentProgram?.title) return currentProgram.title;
    if (currentChannel?.name) return currentChannel.name;
    return t('nowPlaying');
  }, [currentStream, currentProgram?.title, currentChannel?.name, route.params?.title, t]);"""

content = re.sub(
    r'  const playbackTitle = useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);',
    replacement,
    content
)

with open('screens/PlayerScreen.tsx', 'w') as f:
    f.write(content)
