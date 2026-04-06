import re

with open('screens/WelcomeScreen.tsx', 'r') as f:
    content = f.read()

# Add keyboardAppearance="dark" and fix colors
content = re.sub(r'(<TextInput\s+style=\{[^}]+\])', r'\1\n            keyboardAppearance="dark"', content)

with open('screens/WelcomeScreen.tsx', 'w') as f:
    f.write(content)
