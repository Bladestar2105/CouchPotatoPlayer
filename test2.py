# The focus logic in ChannelList seems correct:
# route.params.focusChannelId triggers setFocusedChannelId
# ChannelRow sets hasTVPreferredFocus={isFocused}
# Is there a bug where focusedChannelId is set but doesn't get focus because firstCategoryRef steals it?
# In MainLayout, when navigating back, `route.params.returnTab === 'channels'` triggers:
# `contentRef.current?.focusFirstItem();`
# But focusFirstItem explicitly checks: `if (viewMode === 'epg' || restoreFocusOnSelectedChannel) return;`
# So if restoreFocusOnSelectedChannel is true, it doesn't steal focus!
