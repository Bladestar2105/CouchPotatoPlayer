import re

with open('screens/WelcomeScreen.tsx', 'r') as f:
    content = f.read()

# Add keyboardAppearance directly
content = content.replace('selectionColor="#E9692A"', 'selectionColor="#E9692A"\n            keyboardAppearance={isAppleTV ? "dark" : "default"}')

with open('screens/WelcomeScreen.tsx', 'w') as f:
    f.write(content)
