import re

with open('screens/WelcomeScreen.tsx', 'r') as f:
    content = f.read()

# Fix styles.input and styles.inputFocused backgroundColor and placeholderTextColor
content = content.replace("placeholderTextColor='rgba(45, 66, 99, 0.6)'", "placeholderTextColor='#888888'")
content = content.replace("placeholderTextColor=\"#888\"", "placeholderTextColor='#888888'")

with open('screens/WelcomeScreen.tsx', 'w') as f:
    f.write(content)
