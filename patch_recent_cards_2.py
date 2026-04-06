import re

with open('components/RecentlyWatchedList.tsx', 'r') as f:
    content = f.read()

# Add a flex: 0 instead of taking available space, or ensure the container doesn't stretch items.
# Wait, FlatList stretches rows if `flex: 1` is applied to items, but we set explicit `width: cardWidth`.
# Why did the user report "Bei Zuletzt gesehen werden die Icons je weniger es sind riesiger dargestellt!" ?
# Maybe because of `flex: 1` in `card` style? Let's check `styles.card`.
