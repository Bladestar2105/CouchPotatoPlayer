import re

with open('screens/PlayerScreen.tsx', 'r') as f:
    content = f.read()

# Add a ref for the debounce timer
content = content.replace(
    'const currentTimeRef = useRef(0);',
    'const currentTimeRef = useRef(0);\n  const seekDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);'
)

# Replace the window hack with the ref
content = content.replace('(window as any).seekDebounceTimer', 'seekDebounceTimerRef.current')

with open('screens/PlayerScreen.tsx', 'w') as f:
    f.write(content)
