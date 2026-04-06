import re

with open('components/RecentlyWatchedList.tsx', 'r') as f:
    content = f.read()

# Let's fix cardWidth calculation.
# const cardWidth = Math.max(140, Math.floor((dimensions.width - horizontalPadding - (cardGap * numColumns)) / numColumns));
# If dimensions.width is very large and numColumns is 3 (non-tv mode but large screen? iPad?), the cardWidth becomes huge.
# On TV it is 6 columns, so it's smaller, but if it's 3 on mobile landscape it might be huge.
# Let's cap cardWidth to a sensible max width, e.g., 200.

replacement = """  const numColumns = isTvMode ? 6 : Math.max(3, Math.floor(dimensions.width / 160));
  const horizontalPadding = 32; // list container left+right padding
  const cardGap = 16; // combined left+right margin from styles.card
  const cardWidth = Math.min(220, Math.max(140, Math.floor((dimensions.width - horizontalPadding - (cardGap * numColumns)) / numColumns)));"""

content = re.sub(
    r'  const numColumns = isTvMode \? 6 : 3;\n  const horizontalPadding = 32;.*?\n  const cardGap = 16;.*?\n  const cardWidth = [^\n]+;',
    replacement,
    content
)

with open('components/RecentlyWatchedList.tsx', 'w') as f:
    f.write(content)
