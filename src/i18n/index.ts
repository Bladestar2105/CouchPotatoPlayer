import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform, NativeModules } from 'react-native';

const en = {
  translation: {
    sidebar: {
      live: 'Live TV',
      movies: 'Movies',
      series: 'Series',
      search: 'Search',
      settings: 'Settings'
    },
    home: {
      recentlyWatched: 'Recently Watched',
      favorites: 'Favorites',
      nothingToSeeHere: 'Nothing to see here...',
      noChannels: 'No channels found...',
      pullToRefresh: 'Pull to refresh',
      allCategories: 'All Categories'
    },
    player: {
      buffering: 'Buffering...',
      unableToPlay: 'Unable to play stream',
      retry: 'Retry',
      goBack: 'Go Back',
      continueWatching: 'Continue Watching?',
      continueFrom: 'Continue from',
      startOver: 'Start from Beginning',
      sleepTimer: 'Sleep Timer',
      sleepTimerSet: 'Sleep timer: {{minutes}} min',
      sleepTimerEnded: 'Sleep timer ended',
      sleepTimerCancelled: 'Sleep timer cancelled',
      audioTrack: 'Audio Track',
      subtitles: 'Subtitles',
      off: 'Off',
      upNext: 'Up Next',
      share: 'Share',
      stats: 'Stats',
      live: 'LIVE'
    },
    settings: {
      title: 'Settings',
      appearance: 'Appearance',
      theme: 'Theme',
      parentalControls: 'Parental Controls',
      pinLock: 'PIN Lock',
      pinSet: 'PIN is set',
      noPinSet: 'No PIN set (default: 0000)',
      setPin: 'Set PIN',
      removePin: 'Remove',
      lockedChannels: 'Locked Channels',
      channelsLocked: '{{count}} channels locked',
      data: 'Data',
      clearHistory: 'Clear Watch History',
      resetApp: 'Reset App',
      providerHealth: 'Provider Health',
      checkHealth: 'Check Health',
      streaming: 'Streaming',
      videoQuality: 'Video Quality',
      bufferSize: 'Buffer Size',
      advanced: 'Advanced'
    },
    search: {
      placeholder: 'Search channels, movies, series...',
      recentSearches: 'Recent Searches',
      noResults: 'No results found'
    },
    common: {
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      confirm: 'Confirm',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      addedToFavorites: 'Added to favorites',
      removedFromFavorites: 'Removed from favorites',
      contentRefreshed: 'Content refreshed',
      refreshFailed: 'Refresh failed'
    },
    login: {
      iptvManagerOnly: 'This app is only compatible with the IPTV-Manager.'
    }
  }
};

const de = {
  translation: {
    sidebar: {
      live: 'Live TV',
      movies: 'Filme',
      series: 'Serien',
      search: 'Suche',
      settings: 'Einstellungen'
    },
    home: {
      recentlyWatched: 'Zuletzt gesehen',
      favorites: 'Favoriten',
      nothingToSeeHere: 'Hier gibt es nichts zu sehen...',
      noChannels: 'Keine Kanäle gefunden...',
      pullToRefresh: 'Zum Aktualisieren ziehen',
      allCategories: 'Alle Kategorien'
    },
    player: {
      buffering: 'Wird geladen...',
      unableToPlay: 'Stream kann nicht abgespielt werden',
      retry: 'Erneut versuchen',
      goBack: 'Zurück',
      continueWatching: 'Weiterschauen?',
      continueFrom: 'Weiter ab',
      startOver: 'Von vorne starten',
      sleepTimer: 'Sleep Timer',
      sleepTimerSet: 'Sleep Timer: {{minutes}} Min.',
      sleepTimerEnded: 'Sleep Timer beendet',
      sleepTimerCancelled: 'Sleep Timer abgebrochen',
      audioTrack: 'Tonspur',
      subtitles: 'Untertitel',
      off: 'Aus',
      upNext: 'Als Nächstes',
      share: 'Teilen',
      stats: 'Info',
      live: 'LIVE'
    },
    settings: {
      title: 'Einstellungen',
      appearance: 'Darstellung',
      theme: 'Design',
      parentalControls: 'Jugendschutz',
      pinLock: 'PIN-Sperre',
      pinSet: 'PIN ist gesetzt',
      noPinSet: 'Kein PIN gesetzt (Standard: 0000)',
      setPin: 'PIN setzen',
      removePin: 'Entfernen',
      lockedChannels: 'Gesperrte Kanäle',
      channelsLocked: '{{count}} Kanäle gesperrt',
      data: 'Daten',
      clearHistory: 'Verlauf löschen',
      resetApp: 'App zurücksetzen',
      providerHealth: 'Anbieter-Status',
      checkHealth: 'Status prüfen',
      streaming: 'Streaming',
      videoQuality: 'Videoqualität',
      bufferSize: 'Puffergröße',
      advanced: 'Erweitert'
    },
    search: {
      placeholder: 'Kanäle, Filme, Serien suchen...',
      recentSearches: 'Letzte Suchen',
      noResults: 'Keine Ergebnisse gefunden'
    },
    common: {
      cancel: 'Abbrechen',
      save: 'Speichern',
      delete: 'Löschen',
      confirm: 'Bestätigen',
      loading: 'Wird geladen...',
      error: 'Fehler',
      success: 'Erfolg',
      addedToFavorites: 'Zu Favoriten hinzugefügt',
      removedFromFavorites: 'Aus Favoriten entfernt',
      contentRefreshed: 'Inhalte aktualisiert',
      refreshFailed: 'Aktualisierung fehlgeschlagen'
    },
    login: {
      iptvManagerOnly: 'Die App ist nur mit dem IPTV-Manager kompatibel.'
    }
  }
};

const tr = {
  translation: {
    sidebar: {
      live: 'Canlı TV',
      movies: 'Filmler',
      series: 'Diziler',
      search: 'Ara',
      settings: 'Ayarlar'
    },
    home: {
      recentlyWatched: 'Son İzlenenler',
      favorites: 'Favoriler',
      nothingToSeeHere: 'Burada görecek bir şey yok...',
      noChannels: 'Kanal bulunamadı...',
      pullToRefresh: 'Yenilemek için çekin',
      allCategories: 'Tüm Kategoriler'
    },
    player: {
      buffering: 'Yükleniyor...',
      unableToPlay: 'Yayın oynatılamıyor',
      retry: 'Tekrar Dene',
      goBack: 'Geri Dön',
      continueWatching: 'İzlemeye Devam Et?',
      continueFrom: 'Devam et',
      startOver: 'Baştan Başla',
      sleepTimer: 'Uyku Zamanlayıcı',
      sleepTimerSet: 'Uyku zamanlayıcı: {{minutes}} dk',
      sleepTimerEnded: 'Uyku zamanlayıcı sona erdi',
      sleepTimerCancelled: 'Uyku zamanlayıcı iptal edildi',
      audioTrack: 'Ses',
      subtitles: 'Altyazı',
      off: 'Kapalı',
      upNext: 'Sırada',
      share: 'Paylaş',
      stats: 'Bilgi',
      live: 'CANLI'
    },
    settings: {
      title: 'Ayarlar',
      appearance: 'Görünüm',
      theme: 'Tema',
      parentalControls: 'Ebeveyn Kontrolü',
      pinLock: 'PIN Kilidi',
      pinSet: 'PIN ayarlandı',
      noPinSet: 'PIN ayarlanmadı (varsayılan: 0000)',
      setPin: 'PIN Ayarla',
      removePin: 'Kaldır',
      lockedChannels: 'Kilitli Kanallar',
      channelsLocked: '{{count}} kanal kilitli',
      data: 'Veri',
      clearHistory: 'İzleme Geçmişini Temizle',
      resetApp: 'Uygulamayı Sıfırla',
      providerHealth: 'Sağlayıcı Durumu',
      checkHealth: 'Durumu Kontrol Et',
      streaming: 'Akış',
      videoQuality: 'Video Kalitesi',
      bufferSize: 'Tampon Boyutu',
      advanced: 'Gelişmiş'
    },
    search: {
      placeholder: 'Kanal, film, dizi ara...',
      recentSearches: 'Son Aramalar',
      noResults: 'Sonuç bulunamadı'
    },
    common: {
      cancel: 'İptal',
      save: 'Kaydet',
      delete: 'Sil',
      confirm: 'Onayla',
      loading: 'Yükleniyor...',
      error: 'Hata',
      success: 'Başarılı',
      addedToFavorites: 'Favorilere eklendi',
      removedFromFavorites: 'Favorilerden kaldırıldı',
      contentRefreshed: 'İçerik güncellendi',
      refreshFailed: 'Güncelleme başarısız'
    },
    login: {
      iptvManagerOnly: 'Bu uygulama yalnızca IPTV-Manager ile uyumludur.'
    }
  }
};

const ar = {
  translation: {
    sidebar: {
      live: 'بث مباشر',
      movies: 'أفلام',
      series: 'مسلسلات',
      search: 'بحث',
      settings: 'الإعدادات'
    },
    home: {
      recentlyWatched: 'شوهد مؤخراً',
      favorites: 'المفضلة',
      nothingToSeeHere: 'لا يوجد شيء هنا...',
      noChannels: 'لم يتم العثور على قنوات...',
      pullToRefresh: 'اسحب للتحديث',
      allCategories: 'جميع الفئات'
    },
    player: {
      buffering: 'جاري التحميل...',
      unableToPlay: 'تعذر تشغيل البث',
      retry: 'إعادة المحاولة',
      goBack: 'رجوع',
      continueWatching: 'متابعة المشاهدة؟',
      continueFrom: 'متابعة من',
      startOver: 'البدء من جديد',
      sleepTimer: 'مؤقت النوم',
      sleepTimerSet: 'مؤقت النوم: {{minutes}} دقيقة',
      sleepTimerEnded: 'انتهى مؤقت النوم',
      sleepTimerCancelled: 'تم إلغاء مؤقت النوم',
      audioTrack: 'الصوت',
      subtitles: 'الترجمة',
      off: 'إيقاف',
      upNext: 'التالي',
      share: 'مشاركة',
      stats: 'معلومات',
      live: 'مباشر'
    },
    settings: {
      title: 'الإعدادات',
      appearance: 'المظهر',
      theme: 'السمة',
      parentalControls: 'الرقابة الأبوية',
      pinLock: 'قفل PIN',
      pinSet: 'تم تعيين PIN',
      noPinSet: 'لم يتم تعيين PIN (الافتراضي: 0000)',
      setPin: 'تعيين PIN',
      removePin: 'إزالة',
      lockedChannels: 'القنوات المقفلة',
      channelsLocked: '{{count}} قنوات مقفلة',
      data: 'البيانات',
      clearHistory: 'مسح السجل',
      resetApp: 'إعادة تعيين التطبيق',
      providerHealth: 'حالة المزود',
      checkHealth: 'فحص الحالة',
      streaming: 'البث',
      videoQuality: 'جودة الفيديو',
      bufferSize: 'حجم التخزين المؤقت',
      advanced: 'متقدم'
    },
    search: {
      placeholder: 'ابحث عن قنوات، أفلام، مسلسلات...',
      recentSearches: 'عمليات البحث الأخيرة',
      noResults: 'لم يتم العثور على نتائج'
    },
    common: {
      cancel: 'إلغاء',
      save: 'حفظ',
      delete: 'حذف',
      confirm: 'تأكيد',
      loading: 'جاري التحميل...',
      error: 'خطأ',
      success: 'نجاح',
      addedToFavorites: 'تمت الإضافة إلى المفضلة',
      removedFromFavorites: 'تمت الإزالة من المفضلة',
      contentRefreshed: 'تم تحديث المحتوى',
      refreshFailed: 'فشل التحديث'
    },
    login: {
      iptvManagerOnly: 'هذا التطبيق متوافق فقط مع IPTV-Manager.'
    }
  }
};

const fr = {
  translation: {
    sidebar: {
      live: 'TV en Direct',
      movies: 'Films',
      series: 'Séries',
      search: 'Recherche',
      settings: 'Paramètres'
    },
    home: {
      recentlyWatched: 'Récemment regardé',
      favorites: 'Favoris',
      nothingToSeeHere: 'Rien à voir ici...',
      noChannels: 'Aucune chaîne trouvée...',
      pullToRefresh: 'Tirer pour actualiser',
      allCategories: 'Toutes les catégories'
    },
    player: {
      buffering: 'Chargement...',
      unableToPlay: 'Impossible de lire le flux',
      retry: 'Réessayer',
      goBack: 'Retour',
      continueWatching: 'Continuer à regarder ?',
      continueFrom: 'Reprendre à',
      startOver: 'Reprendre depuis le début',
      sleepTimer: 'Minuterie de sommeil',
      sleepTimerSet: 'Minuterie: {{minutes}} min',
      sleepTimerEnded: 'Minuterie terminée',
      sleepTimerCancelled: 'Minuterie annulée',
      audioTrack: 'Piste audio',
      subtitles: 'Sous-titres',
      off: 'Désactivé',
      upNext: 'À suivre',
      share: 'Partager',
      stats: 'Infos',
      live: 'EN DIRECT'
    },
    settings: {
      title: 'Paramètres',
      appearance: 'Apparence',
      theme: 'Thème',
      parentalControls: 'Contrôle parental',
      pinLock: 'Verrouillage PIN',
      pinSet: 'PIN défini',
      noPinSet: 'Aucun PIN (par défaut: 0000)',
      setPin: 'Définir PIN',
      removePin: 'Supprimer',
      lockedChannels: 'Chaînes verrouillées',
      channelsLocked: '{{count}} chaînes verrouillées',
      data: 'Données',
      clearHistory: "Effacer l'historique",
      resetApp: "Réinitialiser l'application",
      providerHealth: 'État du fournisseur',
      checkHealth: "Vérifier l'état",
      streaming: 'Streaming',
      videoQuality: 'Qualité vidéo',
      bufferSize: 'Taille du tampon',
      advanced: 'Avancé'
    },
    search: {
      placeholder: 'Rechercher chaînes, films, séries...',
      recentSearches: 'Recherches récentes',
      noResults: 'Aucun résultat trouvé'
    },
    common: {
      cancel: 'Annuler',
      save: 'Enregistrer',
      delete: 'Supprimer',
      confirm: 'Confirmer',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      addedToFavorites: 'Ajouté aux favoris',
      removedFromFavorites: 'Retiré des favoris',
      contentRefreshed: 'Contenu actualisé',
      refreshFailed: "Échec de l'actualisation"
    },
    login: {
      iptvManagerOnly: "Cette application est uniquement compatible avec l'IPTV-Manager."
    }
  }
};

const es = {
  translation: {
    sidebar: {
      live: 'TV en Vivo',
      movies: 'Películas',
      series: 'Series',
      search: 'Buscar',
      settings: 'Ajustes'
    },
    home: {
      recentlyWatched: 'Visto recientemente',
      favorites: 'Favoritos',
      nothingToSeeHere: 'Nada que ver aquí...',
      noChannels: 'No se encontraron canales...',
      pullToRefresh: 'Desliza para actualizar',
      allCategories: 'Todas las categorías'
    },
    player: {
      buffering: 'Cargando...',
      unableToPlay: 'No se puede reproducir',
      retry: 'Reintentar',
      goBack: 'Volver',
      continueWatching: '¿Seguir viendo?',
      continueFrom: 'Continuar desde',
      startOver: 'Empezar de nuevo',
      sleepTimer: 'Temporizador',
      sleepTimerSet: 'Temporizador: {{minutes}} min',
      sleepTimerEnded: 'Temporizador finalizado',
      sleepTimerCancelled: 'Temporizador cancelado',
      audioTrack: 'Audio',
      subtitles: 'Subtítulos',
      off: 'Desactivado',
      upNext: 'A continuación',
      share: 'Compartir',
      stats: 'Info',
      live: 'EN VIVO'
    },
    settings: {
      title: 'Ajustes',
      appearance: 'Apariencia',
      theme: 'Tema',
      parentalControls: 'Control parental',
      pinLock: 'Bloqueo PIN',
      pinSet: 'PIN configurado',
      noPinSet: 'Sin PIN (predeterminado: 0000)',
      setPin: 'Configurar PIN',
      removePin: 'Eliminar',
      lockedChannels: 'Canales bloqueados',
      channelsLocked: '{{count}} canales bloqueados',
      data: 'Datos',
      clearHistory: 'Borrar historial',
      resetApp: 'Restablecer app',
      providerHealth: 'Estado del proveedor',
      checkHealth: 'Verificar estado',
      streaming: 'Streaming',
      videoQuality: 'Calidad de video',
      bufferSize: 'Tamaño del búfer',
      advanced: 'Avanzado'
    },
    search: {
      placeholder: 'Buscar canales, películas, series...',
      recentSearches: 'Búsquedas recientes',
      noResults: 'Sin resultados'
    },
    common: {
      cancel: 'Cancelar',
      save: 'Guardar',
      delete: 'Eliminar',
      confirm: 'Confirmar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      addedToFavorites: 'Añadido a favoritos',
      removedFromFavorites: 'Eliminado de favoritos',
      contentRefreshed: 'Contenido actualizado',
      refreshFailed: 'Error al actualizar'
    },
    login: {
      iptvManagerOnly: 'Esta aplicación solo es compatible con IPTV-Manager.'
    }
  }
};

const getSystemLanguage = () => {
  let locale = 'en';
  if (Platform.OS === 'ios') {
    locale = NativeModules.SettingsManager?.settings?.AppleLocale ||
             NativeModules.SettingsManager?.settings?.AppleLanguages[0] ||
             'en';
  } else if (Platform.OS === 'android') {
    locale = NativeModules.I18nManager?.localeIdentifier || 'en';
  } else if (Platform.OS === 'web') {
    locale = typeof globalThis !== 'undefined' && (globalThis as any).navigator ? (globalThis as any).navigator.language : 'en';
  }
  return locale.split(/[-_]/)[0].toLowerCase();
};

export const supportedLanguages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

i18n
  .use(initReactI18next)
  .init({
    resources: { en, de, tr, ar, fr, es },
    lng: getSystemLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;