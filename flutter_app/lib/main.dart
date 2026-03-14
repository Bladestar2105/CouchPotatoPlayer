import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:provider/provider.dart';

import 'providers/app_provider.dart';
import 'providers/settings_provider.dart';
import 'screens/home_screen.dart';
import 'screens/welcome_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/search_screen.dart';
import 'package:flutter/services.dart';
import 'screens/pin_setup_screen.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'l10n/app_localizations.dart';
import 'utils/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();

  final appProvider = AppProvider();
  await appProvider.init();

  final settingsProvider = SettingsProvider();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: appProvider),
        ChangeNotifierProvider.value(value: settingsProvider),
      ],
      child: const CouchPotatoPlayerApp(),
    ),
  );
}

class CouchPotatoPlayerApp extends StatelessWidget {
  const CouchPotatoPlayerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppProvider>(
      builder: (context, provider, child) {
        return Shortcuts(
          shortcuts: <ShortcutActivator, Intent>{
            const SingleActivator(LogicalKeyboardKey.select): const ActivateIntent(),
          },
          child: MaterialApp(
            title: 'CouchPotatoPlayer',
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: const [
              Locale('en', ''), // English
              Locale('de', ''), // German
            ],
            theme: AppTheme.getTheme(provider.themeMode),
            initialRoute: provider.config == null ? '/' : '/home',
            routes: {
              '/': (context) => const WelcomeScreen(),
              '/home': (context) => const HomeScreen(),
              '/settings': (context) => const SettingsScreen(),
              '/search': (context) => const SearchScreen(),
              '/pin_setup': (context) => const PinSetupScreen(),
            },
            debugShowCheckedModeBanner: false,
          ),
        );
      },
    );
  }
}
