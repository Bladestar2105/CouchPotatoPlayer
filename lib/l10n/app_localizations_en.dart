// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'CouchPotatoPlayer';

  @override
  String get live => 'Live';

  @override
  String get vod => 'Movies';

  @override
  String get series => 'Series';

  @override
  String get favorites => 'Favorites';

  @override
  String get recents => 'Recents';

  @override
  String get settings => 'Settings';
}
