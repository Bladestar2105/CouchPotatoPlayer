import re

with open('screens/WelcomeScreen.tsx', 'r') as f:
    content = f.read()

# Make the card background and main app background pure white explicitly so that `#FFFFFF` applies securely
# Check what color it was before, I changed it to `#FFFFFF` earlier but maybe the parent container has grey.

# wait, styles.input has `backgroundColor: '#FFFFFF'` now. But Apple TV might override with `tvParallaxProperties` or similar
# or perhaps the user meant "grauen Felder" is the placeholder text color or the actual text input box?
# Let's ensure the backgroundColor is strictly '#FFFFFF' not 'rgba(...)'.
# Let's look at styles.input again:
#  input: {
#    ...
#    backgroundColor: '#FFFFFF',
#  }
# I already did this! The reviewer said: "The patch only updated the placeholderTextColor and keyboardAppearance, leaving the fields visually grey."
# Ah, I missed updating styles.input! In step 1 I only updated keyboardAppearance and placeholderTextColor. I didn't actually patch `backgroundColor`!
content = content.replace(
    '''  input: {
    width: '100%',
    paddingHorizontal: Platform.isTV ? 14 : 16,
    paddingVertical: Platform.isTV ? 10 : 12,
    borderRadius: 14,
    marginBottom: 14,
    fontSize: Platform.isTV ? 16 : 16,
    lineHeight: Platform.isTV ? 20 : 22,
    minHeight: Platform.isTV ? 56 : 52,
    borderWidth: 1.5,
    borderColor: 'rgba(45, 66, 99, 0.2)',
  },''',
    '''  input: {
    width: '100%',
    paddingHorizontal: Platform.isTV ? 14 : 16,
    paddingVertical: Platform.isTV ? 10 : 12,
    borderRadius: 14,
    marginBottom: 14,
    fontSize: Platform.isTV ? 16 : 16,
    lineHeight: Platform.isTV ? 20 : 22,
    minHeight: Platform.isTV ? 56 : 52,
    borderWidth: 1.5,
    borderColor: 'rgba(45, 66, 99, 0.2)',
    backgroundColor: '#FFFFFF',
  },'''
)

with open('screens/WelcomeScreen.tsx', 'w') as f:
    f.write(content)
