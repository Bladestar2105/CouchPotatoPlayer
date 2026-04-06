import re

with open('utils/i18nResources.ts', 'r') as f:
    content = f.read()

# I messed up the injection of DE block. Let's fix it manually.
de_add = """      "loadingProfile": "Lade Profil:",
      "playlistUpdating": "Aktualisiere Playlist...",
      "clearList": "Liste leeren",
      "remove": "Entfernen",
      "noHistory": "Kein Verlauf vorhanden.",
      "historyHint": "Schaue Kanäle, Filme oder Serien, um sie hier zu sehen.",
"""

# Let's completely remove the bad duplicate "loadingProfile" and append properly
content = re.sub(r'"loadingProfile": "Profil laden:",\n\s*"loadingProfile": "Lade Profil:",\n', r'', content)
content = content.replace('"loadingProfile": "Lade Profil:",', de_add)

with open('utils/i18nResources.ts', 'w') as f:
    f.write(content)
