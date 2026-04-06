import re

for filename in ['screens/SeasonScreen.tsx', 'screens/EpisodeScreen.tsx', 'screens/MediaInfoScreen.tsx']:
    try:
        with open(filename, 'r') as f:
            content = f.read()

        # The issue where TV menu key gets sticky might be related to navigation.goBack()
        # firing BEFORE the effect cleanup runs on the unmounted component, leaving it disabled.
        # It's better to explicitly trigger disableTVMenuKey BEFORE navigation.goBack()

        replacement = """    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Platform.isTV && TVEventControl?.disableTVMenuKey) {
        TVEventControl.disableTVMenuKey();
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      navigation.navigate('Home');
      return true;
    });"""

        content = re.sub(
            r"    const backHandler = BackHandler\.addEventListener\('hardwareBackPress', \(\) => \{\n      if \(navigation\.canGoBack\(\)\) \{\n        navigation\.goBack\(\);\n        return true;\n      \}\n      navigation\.navigate\('Home'\);\n      return true;\n    \}\);",
            replacement,
            content
        )

        with open(filename, 'w') as f:
            f.write(content)
    except FileNotFoundError:
        pass
