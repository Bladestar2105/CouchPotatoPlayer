import re

with open('screens/SettingsScreen.tsx', 'r') as f:
    content = f.read()

# Make sure Switch row triggers are selectable
content = content.replace(
    '''disabled={!onPress}''',
    '''disabled={!onPress && Platform.isTV}'''
)
# If a row has no onPress but has a switch, we want it to be selectable if Platform.isTV, but wait, onPress is required to toggle.
# Wait, for Switch elements on TV, the parent should capture the press.

# Let's ensure tvParallaxProperties enabled = false are also added if needed, but not strictly necessary unless specified.
with open('screens/SettingsScreen.tsx', 'w') as f:
    f.write(content)
