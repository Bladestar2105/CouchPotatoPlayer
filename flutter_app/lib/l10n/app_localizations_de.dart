// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for German (`de`).
class AppLocalizationsDe extends AppLocalizations {
  AppLocalizationsDe([String locale = 'de']) : super(locale);

  @override
  String get appTitle => 'CouchPotatoPlayer';

  @override
  String get live => 'Live TV';

  @override
  String get vod => 'Filme';

  @override
  String get series => 'Serien';

  @override
  String get favorites => 'Favoriten';

  @override
  String get recents => 'Zuletzt';

  @override
  String get settings => 'Einstellungen';
}
