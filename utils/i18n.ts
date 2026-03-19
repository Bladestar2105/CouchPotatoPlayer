import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

const resources = {
  en: {
    translation: {
      "appTitle": "My IPTV Profiles",
      "parentalControl": "Parental Control",
      "channels": "Channels",
      "movies": "Movies",
      "series": "Series",
      "favorites": "Favorites",
      "recent": "Recent",
      "emptyProfile": "This profile is empty or could not be parsed.",
      "pinControl": "Parental Control (PIN)",
      "manageProfiles": "Manage Profiles (Logout)",
      "changingProfile": "Changing profile via menu...",
      "addProfile": "Add a Profile",
      "editProfile": "Edit Profile",
      "profileType": "Profile Type",
      "profileName": "Profile Name",
      "exMyISP": "Ex: My ISP",
      "m3uUrl": "M3U URL",
      "serverUrl": "Server URL (with http:// and port)",
      "username": "Username",
      "password": "Password",
      "add": "Add",
      "save": "Save",
      "cancel": "Cancel",
      "savedProfiles": "Saved Profiles",
      "loading": "Loading...",
      "error": "Error",
      "noSavedProfiles": "No saved profiles.",
      "errorFillProfileName": "Please fill in the profile name",
      "errorFillM3UUrl": "Please fill in the M3U URL",
      "errorFillServerAndUser": "Please fill in the Server and Username",
      "unsupportedProfileType": "Unsupported profile type",
      "success": "Success",
      "profileUpdated": "Profile \"{{name}}\" updated.",
      "unsupported": "Unsupported",
      "stalkerEditNotImplemented": "Editing Stalker profiles is not yet implemented.",
      "loadingProfile": "Loading profile:",
      "deleteProfile": "Delete Profile",
      "deleteConfirmation": "Are you sure you want to delete \"{{name}}\"?",
      "delete": "Delete",
      "load": "Load",
      "edit": "Edit",
    }
  },
  de: {
    translation: {
      "appTitle": "Meine IPTV-Profile",
      "parentalControl": "Kindersicherung",
      "channels": "Sender",
      "movies": "Filme",
      "series": "Serien",
      "favorites": "Favoriten",
      "recent": "Kürzlich",
      "emptyProfile": "Dieses Profil ist leer oder konnte nicht geparst werden.",
      "pinControl": "Kindersicherung (PIN)",
      "manageProfiles": "Profile verwalten (Abmelden)",
      "changingProfile": "Profilwechsel über das Menü...",
      "addProfile": "Profil hinzufügen",
      "editProfile": "Profil bearbeiten",
      "profileType": "Profiltyp",
      "profileName": "Profilname",
      "exMyISP": "Bsp: Mein ISP",
      "m3uUrl": "M3U-URL",
      "serverUrl": "Server-URL (mit http:// und Port)",
      "username": "Benutzername",
      "password": "Passwort",
      "add": "Hinzufügen",
      "save": "Speichern",
      "cancel": "Abbrechen",
      "savedProfiles": "Gespeicherte Profile",
      "loading": "Wird geladen...",
      "error": "Fehler",
      "noSavedProfiles": "Keine gespeicherten Profile.",
      "errorFillProfileName": "Bitte geben Sie den Profilnamen ein",
      "errorFillM3UUrl": "Bitte geben Sie die M3U-URL ein",
      "errorFillServerAndUser": "Bitte geben Sie den Server und Benutzernamen ein",
      "unsupportedProfileType": "Nicht unterstützter Profiltyp",
      "success": "Erfolg",
      "profileUpdated": "Profil \"{{name}}\" aktualisiert.",
      "unsupported": "Nicht unterstützt",
      "stalkerEditNotImplemented": "Das Bearbeiten von Stalker-Profilen ist noch nicht implementiert.",
      "loadingProfile": "Lade Profil:",
      "deleteProfile": "Profil löschen",
      "deleteConfirmation": "Möchten Sie \"{{name}}\" wirklich löschen?",
      "delete": "Löschen",
      "load": "Laden",
      "edit": "Bearbeiten",
    }
  }
};

let language = Localization.getLocales()[0].languageCode || 'en';
// Default to English if the user language is not supported
if (!resources[language as keyof typeof resources]) {
  language = 'en';
}

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources,
    lng: language,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
