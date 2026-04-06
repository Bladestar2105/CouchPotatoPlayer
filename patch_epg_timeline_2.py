import re

with open('components/EpgTimeline.tsx', 'r') as f:
    content = f.read()

content = content.replace(
"""                style={[
                    styles.channelBox,
                    isPlaying && { borderLeftWidth: 3, borderLeftColor: '#E9692A' },
                    isFocused && { backgroundColor: 'rgba(233, 105, 42, 0.2)', borderWidth: 2, borderColor: '#E9692A' }
                ]}""",
"""                style={[
                    styles.channelBox,
                    { left: Math.max(0, scrollX) },
                    isPlaying && { borderLeftWidth: 3, borderLeftColor: '#E9692A' },
                    isFocused && { backgroundColor: 'rgba(233, 105, 42, 0.2)', borderWidth: 2, borderColor: '#E9692A' }
                ]}""")

with open('components/EpgTimeline.tsx', 'w') as f:
    f.write(content)
