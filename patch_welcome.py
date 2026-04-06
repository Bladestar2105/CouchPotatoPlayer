import re

with open('/app/screens/WelcomeScreen.tsx', 'r') as f:
    content = f.read()

# Make wordmark larger
content = content.replace('width: 320,\n    height: 72,', 'width: 400,\n    height: 100,')

# Use brand colors instead of colors from settings, since background is hardcoded white
# Orange: #E9692A
# Blue: #2D4263

# Replace selected icon color and unselected icon color
content = re.sub(r"color=\{selectedIcon === iconName \? colors\.primary : '#FFF'\}", "color={selectedIcon === iconName ? '#E9692A' : '#2D4263'}", content)

# Type selector background
content = content.replace('backgroundColor: colors.divider', "backgroundColor: 'rgba(45, 66, 99, 0.1)'")

# Type button selection
content = content.replace('type === \'xtream\' && { backgroundColor: colors.primary }', 'type === \'xtream\' && { backgroundColor: \'#E9692A\' }')
content = content.replace('type === \'m3u\' && { backgroundColor: colors.primary }', 'type === \'m3u\' && { backgroundColor: \'#E9692A\' }')

# Type button text color
content = content.replace("type === 'xtream' ? '#FFF' : colors.textSecondary", "type === 'xtream' ? '#FFF' : '#2D4263'")
content = content.replace("type === 'm3u' ? '#FFF' : colors.textSecondary", "type === 'm3u' ? '#FFF' : '#2D4263'")

# Input styles
content = content.replace("backgroundColor: colors.surface, color: colors.text, borderColor: colors.divider", "backgroundColor: '#FFFFFF', color: '#2D4263', borderColor: 'rgba(45, 66, 99, 0.2)'")
content = content.replace("placeholderTextColor={colors.textSecondary}", "placeholderTextColor='rgba(45, 66, 99, 0.6)'")

# Labels and Text
content = content.replace("color: colors.textSecondary", "color: '#2D4263'")
content = content.replace("color: colors.text", "color: '#2D4263'")
content = content.replace("borderColor: colors.primary", "borderColor: '#E9692A'")

# Login / Add buttons
content = content.replace("backgroundColor: colors.primary", "backgroundColor: '#E9692A'")
content = content.replace("color={colors.primary}", "color='#E9692A'")

# Profile Tile Icon container background
content = content.replace("backgroundColor: 'rgba(233, 105, 42, 0.15)'", "backgroundColor: 'rgba(233, 105, 42, 0.15)'")

# Input borders
content = content.replace("borderColor: 'rgba(255,255,255,0.1)'", "borderColor: 'rgba(45, 66, 99, 0.2)'")

with open('/app/screens/WelcomeScreen.tsx', 'w') as f:
    f.write(content)
