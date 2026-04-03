with open('screens/SettingsScreen.tsx', 'r') as f:
    content = f.read()

# Replace the specific UI elements to better match the requested design
content = content.replace(
"""  sidebar: {
    width: Platform.isTV ? 250 : 220,""",
"""  sidebar: {
    width: Platform.isTV ? 280 : 250,"""
)

with open('screens/SettingsScreen.tsx', 'w') as f:
    f.write(content)
