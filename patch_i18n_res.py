import re

with open('utils/i18nResources.ts', 'r') as f:
    content = f.read()

en_add = """      "loadingProfile": "Loading profile:",
      "playlistUpdating": "Updating Playlist...",
      "clearList": "Clear List",
      "remove": "Remove",
      "noHistory": "No history available.",
      "historyHint": "Watch channels, movies, or series to see them here.",
"""

de_add = """      "loadingProfile": "Lade Profil:",
      "playlistUpdating": "Aktualisiere Playlist...",
      "clearList": "Liste leeren",
      "remove": "Entfernen",
      "noHistory": "Kein Verlauf vorhanden.",
      "historyHint": "Schaue Kanäle, Filme oder Serien, um sie hier zu sehen.",
"""

content = content.replace('"loadingProfile": "Loading profile:",\n', en_add)
content = content.replace('"loadingProfile": "Profil laden:",\n', de_add)

with open('utils/i18nResources.ts', 'w') as f:
    f.write(content)
