import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsProvider with ChangeNotifier {
  bool _hardwareAcceleration = true;
  int _bufferSize = 32; // MB
  bool _useSoftwareDecoder = false;
  SharedPreferences? _prefs;

  bool get hardwareAcceleration => _hardwareAcceleration;
  int get bufferSize => _bufferSize;
  bool get useSoftwareDecoder => _useSoftwareDecoder;

  SettingsProvider() {
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    _prefs = await SharedPreferences.getInstance();
    _hardwareAcceleration = _prefs?.getBool('hardwareAcceleration') ?? true;
    _bufferSize = _prefs?.getInt('bufferSize') ?? 32;
    _useSoftwareDecoder = _prefs?.getBool('useSoftwareDecoder') ?? false;
    notifyListeners();
  }

  Future<void> setHardwareAcceleration(bool value) async {
    _hardwareAcceleration = value;
    await _prefs?.setBool('hardwareAcceleration', value);
    notifyListeners();
  }

  Future<void> setBufferSize(int size) async {
    _bufferSize = size;
    await _prefs?.setInt('bufferSize', size);
    notifyListeners();
  }

  Future<void> setUseSoftwareDecoder(bool value) async {
    _useSoftwareDecoder = value;
    await _prefs?.setBool('useSoftwareDecoder', value);
    notifyListeners();
  }
}
