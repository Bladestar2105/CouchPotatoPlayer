import re

with open('screens/PlayerScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '{showChannelSwitch && currentChannel && (',
    '{showChannelSwitch && false && currentChannel && ('
)

with open('screens/PlayerScreen.tsx', 'w') as f:
    f.write(content)
