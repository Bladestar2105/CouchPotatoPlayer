import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:provider/provider.dart';

import 'providers/app_provider.dart';
import 'screens/home_screen.dart';
import 'screens/welcome_screen.dart';
import 'screens/settings_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();

  final appProvider = AppProvider();
  await appProvider.init();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: appProvider),
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
        return MaterialApp(
          title: 'CouchPotatoPlayer',
          theme: ThemeData(
            brightness: Brightness.dark,
            primaryColor: Colors.blue,
            scaffoldBackgroundColor: const Color(0xFF0F0F0F),
            visualDensity: VisualDensity.adaptivePlatformDensity,
          ),
          initialRoute: provider.config == null ? '/' : '/home',
          routes: {
            '/': (context) => const WelcomeScreen(),
            '/home': (context) => const HomeScreen(),
            '/settings': (context) => const SettingsScreen(),
          },
          debugShowCheckedModeBanner: false,
        );
      },
    );
  }
}
