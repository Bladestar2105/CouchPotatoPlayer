import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: const Color(0xFF007AFF),
      scaffoldBackgroundColor: const Color(0xFF121212),
      cardColor: const Color(0xFF1E1E1E),
      dividerColor: const Color(0xFF2C2C2E),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF1C1C1E),
        iconTheme: IconThemeData(color: Colors.white),
      ),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF007AFF),
        secondary: Color(0xFF007AFF),
        surface: Color(0xFF1C1C1E),
        error: Color(0xFFFF453A),
      ),
    );
  }

  static ThemeData get oledTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: const Color(0xFF007AFF),
      scaffoldBackgroundColor: const Color(0xFF000000),
      cardColor: const Color(0xFF0D0D0D),
      dividerColor: const Color(0xFF1A1A1A),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF000000),
        iconTheme: IconThemeData(color: Colors.white),
      ),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFF007AFF),
        secondary: Color(0xFF007AFF),
        surface: Color(0xFF0A0A0A),
        error: Color(0xFFFF453A),
      ),
    );
  }

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: const Color(0xFF007AFF),
      scaffoldBackgroundColor: const Color(0xFFF2F2F7),
      cardColor: const Color(0xFFFFFFFF),
      dividerColor: const Color(0xFFE5E5EA),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFFFFFFFF),
        iconTheme: IconThemeData(color: Colors.black),
        titleTextStyle: TextStyle(color: Colors.black, fontSize: 20, fontWeight: FontWeight.bold),
      ),
      colorScheme: const ColorScheme.light(
        primary: Color(0xFF007AFF),
        secondary: Color(0xFF007AFF),
        surface: Color(0xFFFFFFFF),
        error: Color(0xFFFF3B30),
      ),
    );
  }

  static ThemeData getTheme(String mode) {
    switch (mode) {
      case 'oled':
        return oledTheme;
      case 'light':
        return lightTheme;
      case 'dark':
      default:
        return darkTheme;
    }
  }
}
