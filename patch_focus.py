import re

with open('components/ChannelList.tsx', 'r') as f:
    content = f.read()

# Make sure ChannelRow passes the focusedChannelId and we use a ref
# Actually we can just rely on hasTVPreferredFocus={isFocused} which is already passed:
# <ChannelRow ... isFocused={channel.id === focusedChannelId || (restoreFocusOnSelectedChannel && channel.id === focusedChannelId)} />
# Let's check how ChannelRow is rendered.
