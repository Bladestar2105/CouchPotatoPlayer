import re

with open('utils/i18nResources.ts', 'r') as f:
    content = f.read()

fr_add = """      "loadingProfile": "Chargement du profil:",
      "playlistUpdating": "Mise à jour de la playlist...",
      "clearList": "Vider la liste",
      "remove": "Supprimer",
      "noHistory": "Aucun historique disponible.",
      "historyHint": "Regardez des chaînes, des films ou des séries pour les voir ici.",
"""

content = content.replace('"loadingProfile": "Chargement du profil:",', fr_add)

with open('utils/i18nResources.ts', 'w') as f:
    f.write(content)
