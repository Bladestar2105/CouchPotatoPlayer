import re
import os

for filename in ['screens/SeasonScreen.tsx', 'screens/EpisodeScreen.tsx', 'screens/MediaInfoScreen.tsx']:
    if not os.path.exists(filename): continue
    with open(filename, 'r') as f:
        content = f.read()

    # Wrap flatlists with TVFocusGuideView in EpisodeScreen and SeasonScreen
    if 'EpisodeScreen' in filename or 'SeasonScreen' in filename:
        if 'import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, BackHandler, TVEventControl, TVFocusGuideView } from \'react-native\';' not in content:
           content = re.sub(
               r"import \{ View, Text, FlatList, TouchableOpacity, StyleSheet, (ActivityIndicator, )?Platform, BackHandler, TVEventControl \} from 'react-native';",
               r"import { View, Text, FlatList, TouchableOpacity, StyleSheet, \1Platform, BackHandler, TVEventControl, TVFocusGuideView } from 'react-native';",
               content
           )

        # Replace return (<View style={styles.container}>...FlatList...</View>) with TVFocusGuideView wrapper around Flatlist
        content = re.sub(
            r"(<FlatList[\s\S]*?/>)",
            r"<TVFocusGuideView autoFocus style={{flex: 1}}>\n        \1\n      </TVFocusGuideView>",
            content
        )

    with open(filename, 'w') as f:
        f.write(content)
