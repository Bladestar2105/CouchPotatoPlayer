with open("screens/MediaInfoScreen.tsx", "r") as f:
    content = f.read()

import re
fixed_content = re.sub(
    r'<<<<<<< Updated upstream\n            <TouchableOpacity style={styles.backBtn} onPress={\(\) => { if \(navigation.canGoBack\(\)\) navigation.goBack\(\); else navigation.navigate\(\'Home\'\); }}>\n=======\n            <TouchableOpacity style={styles.backBtn} onPress={\(\) => navigation.goBack\(\)} accessibilityRole="button" accessibilityLabel="Go back">\n>>>>>>> Stashed changes',
    r'<TouchableOpacity style={styles.backBtn} onPress={() => { if (navigation.canGoBack()) navigation.goBack(); else navigation.navigate(\'Home\'); }} accessibilityRole="button" accessibilityLabel="Go back">',
    content
)

with open("screens/MediaInfoScreen.tsx", "w") as f:
    f.write(fixed_content)
