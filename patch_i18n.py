import re

with open('screens/HomeScreen.tsx', 'r') as f:
    content = f.read()

content = content.replace("Aktualisiere Playlist...", "{t('playlistUpdating', 'Aktualisiere Playlist...')}")

with open('screens/HomeScreen.tsx', 'w') as f:
    f.write(content)


with open('components/RecentlyWatchedList.tsx', 'r') as f:
    content = f.read()

content = content.replace("Liste leeren", "{t('clearList', 'Liste leeren')}")
content = content.replace("Entfernen", "{t('remove', 'Entfernen')}")
content = content.replace("Kein Verlauf vorhanden.", "{t('noHistory', 'Kein Verlauf vorhanden.')}")
content = content.replace("Schaue Kanäle, Filme oder Serien, um sie hier zu sehen.", "{t('historyHint', 'Schaue Kanäle, Filme oder Serien, um sie hier zu sehen.')}")

if "import { useTranslation } from 'react-i18next';" not in content:
    content = content.replace("import { useSettings } from '../context/SettingsContext';", "import { useSettings } from '../context/SettingsContext';\nimport { useTranslation } from 'react-i18next';")
if "const { t } = useTranslation();" not in content:
    content = content.replace("const { colors } = useSettings();", "const { colors } = useSettings();\n  const { t } = useTranslation();")

with open('components/RecentlyWatchedList.tsx', 'w') as f:
    f.write(content)
