import re

with open('components/RecentlyWatchedList.tsx', 'r') as f:
    content = f.read()

# Replace `flex: 1` or add maxWidth to prevent card explosion when there are fewer items than columns.
# It seems the FlatList uses `numColumns={numColumns}`. If there are fewer items, the items might stretch
# because of `card: { ... }`.
# Let's check card width constraint.

# The renderItem uses `<View style={[styles.card, { backgroundColor: colors.surface, width: cardWidth }]}>`
# Wait, let's verify if `width: cardWidth` is there.
