import re

with open('components/EpgTimeline.tsx', 'r') as f:
    content = f.read()

# Replace styles.channelBox in EpgRow
# It currently is:
#                style={[
#                    styles.channelBox,
#                    isPlaying && { borderLeftWidth: 3, borderLeftColor: '#E9692A' },
#                    isFocused && { backgroundColor: 'rgba(233, 105, 42, 0.2)', borderWidth: 2, borderColor: '#E9692A' }
#                ]}

replacement = """                style={[
                    styles.channelBox,
                    { left: Math.max(0, scrollX) },
                    isPlaying && { borderLeftWidth: 3, borderLeftColor: '#E9692A' },
                    isFocused && { backgroundColor: 'rgba(233, 105, 42, 0.2)', borderWidth: 2, borderColor: '#E9692A' }
                ]}"""

content = re.sub(
    r'style=\s*\{\s*\[\s*styles\.channelBox,\s*(isPlaying[^,]+,)\s*(isFocused[^\]]+)\s*\]\s*\}',
    r'style={[\n                    styles.channelBox,\n                    { left: Math.max(0, scrollX) },\n                    \1\n                    \2\n                ]}',
    content
)

with open('components/EpgTimeline.tsx', 'w') as f:
    f.write(content)
