import re

with open('components/MovieList.tsx', 'r') as f:
    content = f.read()

# Removing the empty onBlur
content = re.sub(
    r'                  onBlur=\{\(\) => \{\n                     // Check if returning to sidebar via focus loss\n                     if \(Platform\.isTV && props\.onReturnToSidebar && isFirstItem\) \{\n                         // We could trigger return to sidebar, but this might fire too often\. Let\'s rely on BackHandler in HomeScreen or TVFocusGuideView\n                     \}\n                  \}\}\n',
    '',
    content
)

with open('components/MovieList.tsx', 'w') as f:
    f.write(content)
