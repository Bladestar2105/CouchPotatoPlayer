import re

with open('components/ChannelList.tsx', 'r') as f:
    content = f.read()

# Update categoryText numberOfLines from 1 to 2
content = content.replace(
    '<Text style={[tiviStyles.categoryText, { color: isSelected || isFocused ? colors.text : colors.textSecondary }]} numberOfLines={1}>',
    '<Text style={[tiviStyles.categoryText, { color: isSelected || isFocused ? colors.text : colors.textSecondary }]} numberOfLines={2}>'
)

# Expand sidebar width a bit on TV to accommodate 2 lines and count badge
content = content.replace(
    'width: Platform.isTV ? 280 : 220,',
    'width: Platform.isTV ? 320 : 220,'
)

# Increase logo sizes for TV
content = content.replace(
    'width: Platform.isTV ? 56 : 36,',
    'width: Platform.isTV ? 80 : 36,'
)
content = content.replace(
    'height: Platform.isTV ? 40 : 26,',
    'height: Platform.isTV ? 56 : 26,'
)
content = content.replace(
    '<Icon name="tv" size={18} color={colors.textMuted} />',
    '<Icon name="tv" size={Platform.isTV ? 24 : 18} color={colors.textMuted} />'
)

with open('components/ChannelList.tsx', 'w') as f:
    f.write(content)
