import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/iptv.dart' as iptv;
import '../models/iptv.dart' hide Category;
import '../services/storage_service.dart';

class AppProvider extends ChangeNotifier {
  PlayerConfig? config;
  List<PlayerConfig> providers = [];
  int updateIntervalHours = 24;
  int lastProviderUpdate = 0;
  int lastEpgUpdate = 0;
  List<iptv.Category> categories = [];
  List<LiveChannel> channels = [];
  Map<String, List<ParsedProgram>> epgData = {};
  String? pin;
  bool showAdult = false;
  bool isDiskDataLoaded = false;
  String themeMode = 'dark';
  List<String> lockedChannels = [];

  final StorageService _storageService = StorageService();

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();

    // Load config
    final configStr = prefs.getString('config');
    if (configStr != null) {
      config = PlayerConfig.fromJson(json.decode(configStr));
    }

    // Load providers
    final providersStr = prefs.getString('providers');
    if (providersStr != null) {
      final List<dynamic> pList = json.decode(providersStr);
      providers = pList.map((e) => PlayerConfig.fromJson(e)).toList();
    }

    updateIntervalHours = prefs.getInt('updateIntervalHours') ?? 24;
    lastProviderUpdate = prefs.getInt('lastProviderUpdate') ?? 0;
    lastEpgUpdate = prefs.getInt('lastEpgUpdate') ?? 0;
    pin = prefs.getString('pin');
    showAdult = prefs.getBool('showAdult') ?? false;
    themeMode = prefs.getString('themeMode') ?? 'dark';

    final lockedStr = prefs.getString('lockedChannels');
    if (lockedStr != null) {
      lockedChannels = List<String>.from(json.decode(lockedStr));
    }

    // Load large data from disk
    try {
      final cats = await _storageService.loadLargeData('categories.json');
      if (cats != null) {
        categories = (cats as List).map((c) => iptv.Category.fromJson(c)).toList();
      }

      final chans = await _storageService.loadLargeData('channels.json');
      if (chans != null) {
        channels = (chans as List).map((c) => LiveChannel.fromJson(c)).toList();
      }

      final epg = await _storageService.loadLargeData('epgData.json');
      if (epg != null) {
        final Map<String, dynamic> epgMap = epg;
        epgData = epgMap.map((key, value) => MapEntry(
            key, (value as List).map((p) => ParsedProgram.fromJson(p)).toList()));
      }
    } catch (e) {
      debugPrint('Error loading disk data: $e');
    }

    isDiskDataLoaded = true;
    notifyListeners();
  }

  Future<void> setConfig(PlayerConfig? newConfig) async {
    config = newConfig;
    final prefs = await SharedPreferences.getInstance();
    if (newConfig == null) {
      await prefs.remove('config');
    } else {
      await prefs.setString('config', json.encode(newConfig.toJson()));
    }
    notifyListeners();
  }

  Future<void> addProvider(PlayerConfig provider) async {
    final existingIndex = providers.indexWhere((p) => p.id == provider.id);
    if (existingIndex >= 0) {
      providers[existingIndex] = provider;
    } else {
      providers.add(provider);
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('providers', json.encode(providers.map((p) => p.toJson()).toList()));
    notifyListeners();
  }

  Future<void> removeProvider(String id) async {
    providers.removeWhere((p) => p.id == id);
    if (config?.id == id) {
      await setConfig(null);
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('providers', json.encode(providers.map((p) => p.toJson()).toList()));
    notifyListeners();
  }

  Future<void> setCategories(List<iptv.Category> newCategories, {bool skipSave = false}) async {
    categories = newCategories;
    notifyListeners();
    if (!skipSave) {
      await _storageService.saveLargeData('categories.json', newCategories.map((e) => e.toJson()).toList());
    }
  }

  Future<void> setChannels(List<LiveChannel> newChannels, {bool skipSave = false}) async {
    channels = newChannels;
    notifyListeners();
    if (!skipSave) {
      await _storageService.saveLargeData('channels.json', newChannels.map((e) => e.toJson()).toList());
    }
  }

  Future<void> setEpgData(Map<String, List<ParsedProgram>> newEpg, {bool skipSave = false}) async {
    epgData = newEpg;
    notifyListeners();
    if (!skipSave) {
      final epgJson = newEpg.map((k, v) => MapEntry(k, v.map((p) => p.toJson()).toList()));
      await _storageService.saveLargeData('epgData.json', epgJson);
    }
  }

  Future<void> clearState() async {
    await setConfig(null);
    categories = [];
    channels = [];
    epgData = {};
    lastProviderUpdate = 0;
    lastEpgUpdate = 0;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('lastProviderUpdate', 0);
    await prefs.setInt('lastEpgUpdate', 0);

    await _storageService.clearLargeData('categories.json');
    await _storageService.clearLargeData('channels.json');
    await _storageService.clearLargeData('epgData.json');

    notifyListeners();
  }

  Future<void> setLastProviderUpdate(int time) async {
    lastProviderUpdate = time;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('lastProviderUpdate', time);
    notifyListeners();
  }

  Future<void> setLastEpgUpdate(int time) async {
    lastEpgUpdate = time;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('lastEpgUpdate', time);
    notifyListeners();
  }
}
