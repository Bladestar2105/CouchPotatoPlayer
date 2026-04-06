import re

with open('screens/PlayerScreen.tsx', 'r') as f:
    content = f.read()

# The user requested: "Beim Live-Player stehen die Senderinfos an drei stellen: Infoleiste, oben links und oben rechts. Das ist unnötig, es reicht die Infoleiste"
# So if `currentChannel` is true (Live TV) AND `showOverlay` is true, we should HIDE the top bar. Or just hide it for Live TV generally?
# "oben links und oben rechts... es reicht die Infoleiste"
# Let's hide the top bar for Live TV if the overlay is visible. Actually, if `currentChannel` is defined, we don't render the top-left channel info overlay.
# The Top Bar currently renders:
# <Animated.View style={[pStyles.topBar, { opacity: overlayOpacity }]}>
# It has the Back button. We shouldn't hide the back button.
# Let's hide the channel badge and quality badge.

# Find the topChannelBadge and qualityBadge
content = re.sub(
    r'(<View style=\{pStyles\.topChannelBadge\}>[\s\S]*?</View>)',
    r'{!currentChannel && \1}',
    content
)
content = re.sub(
    r'(\{videoMetadata\?\.height.*?<View style=\{pStyles\.qualityBadge\}.*?</View>\n\s*\})',
    r'{!currentChannel && \1}',
    content
)

# And the top right channel switch overlay:
# <Animated.View style={[pStyles.channelSwitchOverlay, { opacity: channelSwitchOpacity }]}>
# I'll just disable the channel switch overlay altogether since they don't want it, or maybe it's fine if it's brief. The user said "oben rechts" which is `showChannelSwitchBriefly`. I'll disable `showChannelSwitchBriefly` or render it null.

# Increase channelLogo size in pStyles
content = content.replace(
    '''  channelLogo: {
      width: 80,
      height: 80,''',
    '''  channelLogo: {
      width: 100,
      height: 100,'''
)

# Inject FPS and width to Live TV EPG container
# Wait, the current live TV EPG text container is missing videoMetadata.
# Let's find it.
metadata_live = """
                                <Text style={pStyles.nextProgramText} numberOfLines={1}>
                                  {nextProgram
                                    ? `Next: ${timeFormatter.format(nextProgram.start)} - ${nextProgram.title}`
                                    : 'Next: —'}
                                </Text>
                            </View>
                         ) : (
                             <Text style={pStyles.noEpgText}>No EPG Data Available</Text>
                         )}

                         {/* Metadata row */}
                         {videoMetadata?.width && videoMetadata?.height && (
                           <View style={pStyles.metadataRow}>
                             <Text style={pStyles.metadataText}>{videoMetadata.width}x{videoMetadata.height}</Text>
                             {videoMetadata.fps ? <Text style={pStyles.metadataText}> • {Math.round(videoMetadata.fps)} FPS</Text> : null}
                             {videoMetadata.bitrate ? <Text style={pStyles.metadataText}> • {Math.round(videoMetadata.bitrate / 1000)} kbps</Text> : null}
                             <Text style={pStyles.metadataText}> • {currentChannel.groupTitle || t('live')}</Text>
                           </View>
                         )}"""

content = re.sub(
    r'''                                <Text style=\{pStyles\.nextProgramText\} numberOfLines=\{1\}>\n                                  \{nextProgram\n                                    \? `Next: \$\{timeFormatter\.format\(nextProgram\.start\)\} - \$\{nextProgram\.title\}`\n                                    : 'Next: —'\}\n                                </Text>\n                            </View>\n                         \) : \(\n                             <Text style=\{pStyles\.noEpgText\}>No EPG Data Available</Text>\n                         \) \}''',
    metadata_live,
    content
)


with open('screens/PlayerScreen.tsx', 'w') as f:
    f.write(content)
