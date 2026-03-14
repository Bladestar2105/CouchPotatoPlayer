import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsProvider with ChangeNotifier {
  bool _hardwareAcceleration = true;
  SharedPreferences? _prefs;

  bool get hardwareAcceleration => _hardwareAcceleration;

  SettingsProvider() {
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    _prefs = await SharedPreferences.getInstance();
    _hardwareAcceleration = _prefs?.getBool('hardwareAcceleration') ?? true;
    notifyListeners();
  }

  Future<void> setHardwareAcceleration(bool value) async {
    _hardwareAcceleration = value;
    await _prefs?.setBool('hardwareAcceleration', value);
    notifyListeners();
  }
}
