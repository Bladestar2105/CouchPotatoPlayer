import re

with open('components/ChannelList.tsx', 'r') as f:
    content = f.read()

# Fix ChannelRow signature
content = re.sub(
    r'const ChannelRow = React\.memo\(\(\{ channel, channelNumber, isPlaying, isFocused, isFav, currentProgram, progressPercent, hasCatchupSupport, onPress, onLongPress, onFocus, colors \}: \{[\s\S]*?    colors: any;\n\}\) => \{',
    r'const ChannelRow = React.memo(React.forwardRef(({ channel, channelNumber, isPlaying, isFocused, isFav, currentProgram, progressPercent, hasCatchupSupport, onPress, onLongPress, onFocus, colors }: {\n    channel: Channel;\n    channelNumber: number;\n    isPlaying: boolean;\n    isFocused: boolean;\n    isFav: boolean;\n    currentProgram: any;\n    progressPercent: number;\n    hasCatchupSupport: boolean;\n    onPress: () => void;\n    onLongPress: () => void;\n    onFocus: () => void;\n    colors: any;\n}, ref: React.Ref<any>) => {',
    content
)

content = re.sub(
    r'(<TouchableOpacity\s+accessible=\{true\})',
    r'<TouchableOpacity ref={ref} accessible={true}',
    content
)

content = re.sub(
    r'           prevProps\.progressPercent === nextProps\.progressPercent;\n\}\);',
    r'           prevProps.progressPercent === nextProps.progressPercent;\n}));',
    content
)

# Also fix the map of refs inside ChannelList component
ref_logic = """
  const channelRefs = useRef<{[key: string]: any}>({});

  useEffect(() => {
    if (restoreFocusOnSelectedChannel && focusedChannelId) {
        setTimeout(() => {
            if (channelRefs.current[focusedChannelId]) {
                channelRefs.current[focusedChannelId].focus?.();
            }
        }, 300);
    }
  }, [restoreFocusOnSelectedChannel, focusedChannelId]);
"""

content = content.replace(
    '  const [restoreFocusOnSelectedChannel, setRestoreFocusOnSelectedChannel] = useState(false);',
    '  const [restoreFocusOnSelectedChannel, setRestoreFocusOnSelectedChannel] = useState(false);\n' + ref_logic
)

content = re.sub(
    r'<ChannelRow\s+channel=\{channel\}',
    r'<ChannelRow ref={(el: any) => (channelRefs.current[channel.id] = el)} channel={channel}',
    content
)

with open('components/ChannelList.tsx', 'w') as f:
    f.write(content)
