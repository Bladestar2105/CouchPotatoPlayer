import re

with open('utils/i18nResources.ts', 'r') as f:
    content = f.read()

fr_add = """      "loadingProfile": "Chargement du profil :",
      "playlistUpdating": "Mise à jour de la playlist...",
      "clearList": "Vider la liste",
      "remove": "Supprimer",
      "noHistory": "Aucun historique disponible.",
      "historyHint": "Regardez des chaînes, des films ou des séries pour les voir ici.",
"""

el_add = """      "loadingProfile": "Φόρτωση προφίλ:",
      "playlistUpdating": "Ενημέρωση λίστας αναπαραγωγής...",
      "clearList": "Καθαρισμός Λίστας",
      "remove": "Αφαίρεση",
      "noHistory": "Δεν υπάρχει διαθέσιμο ιστορικό.",
      "historyHint": "Παρακολουθήστε κανάλια, ταινίες ή σειρές για να τα δείτε εδώ.",
"""

content = content.replace('"loadingProfile": "Chargement du profil :",\n', fr_add)
content = content.replace('"loadingProfile": "Φόρτωση προφίλ:",\n', el_add)

with open('utils/i18nResources.ts', 'w') as f:
    f.write(content)
