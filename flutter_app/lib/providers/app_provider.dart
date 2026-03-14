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
  List<iptv.FavoriteItem> favorites = [];
  List<iptv.RecentlyWatchedItem> recentlyWatched = [];

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

    final favsStr = prefs.getString('favorites');
    if (favsStr != null) {
      final List<dynamic> fList = json.decode(favsStr);
      favorites = fList.map((e) => iptv.FavoriteItem.fromJson(e)).toList();
    }

    final recentsStr = prefs.getString('recentlyWatched');
    if (recentsStr != null) {
      final List<dynamic> rList = json.decode(recentsStr);
      recentlyWatched = rList.map((e) => iptv.RecentlyWatchedItem.fromJson(e)).toList();
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

  // --- Favorites ---
  Future<void> addFavorite(iptv.FavoriteItem item) async {
    if (favorites.any((f) => f.id == item.id && f.type == item.type)) return;
    favorites.insert(0, item);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('favorites', json.encode(favorites.map((f) => f.toJson()).toList()));
    notifyListeners();
  }

  Future<void> removeFavorite(String id) async {
    favorites.removeWhere((f) => f.id == id);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('favorites', json.encode(favorites.map((f) => f.toJson()).toList()));
    notifyListeners();
  }

  bool isFavorite(String id) {
    return favorites.any((f) => f.id == id);
  }

  // --- Recently Watched ---
  Future<void> addRecentlyWatched(iptv.RecentlyWatchedItem item) async {
    recentlyWatched.removeWhere((r) => r.id == item.id && r.type == item.type);
    recentlyWatched.insert(0, item);
    if (recentlyWatched.length > 50) {
      recentlyWatched = recentlyWatched.sublist(0, 50);
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('recentlyWatched', json.encode(recentlyWatched.map((r) => r.toJson()).toList()));
    notifyListeners();
  }

  Future<void> updatePlaybackPosition(String id, int position, {int? duration}) async {
    final index = recentlyWatched.indexWhere((r) => r.id == id);
    if (index >= 0) {
      final item = recentlyWatched[index];
      recentlyWatched[index] = iptv.RecentlyWatchedItem(
        id: item.id,
        type: item.type,
        name: item.name,
        icon: item.icon,
        extension: item.extension,
        directSource: item.directSource,
        lastWatchedAt: DateTime.now().millisecondsSinceEpoch,
        position: position,
        duration: duration ?? item.duration,
        episodeId: item.episodeId,
        episodeName: item.episodeName,
        seasonNumber: item.seasonNumber,
        episodeNumber: item.episodeNumber,
      );
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('recentlyWatched', json.encode(recentlyWatched.map((r) => r.toJson()).toList()));
      notifyListeners();
    }
  }

  Future<void> removeRecentlyWatched(String id) async {
    recentlyWatched.removeWhere((r) => r.id == id);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('recentlyWatched', json.encode(recentlyWatched.map((r) => r.toJson()).toList()));
    notifyListeners();
  }

  Future<void> clearRecentlyWatched() async {
    recentlyWatched.clear();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('recentlyWatched');
    notifyListeners();
  }

  // --- Parental Control / PIN ---
  Future<void> setPin(String? newPin) async {
    pin = newPin;
    final prefs = await SharedPreferences.getInstance();
    if (newPin == null) {
      await prefs.remove('pin');
    } else {
      await prefs.setString('pin', newPin);
    }
    notifyListeners();
  }

  Future<void> setShowAdult(bool show) async {
    showAdult = show;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('showAdult', show);
    notifyListeners();
  }

  Future<void> setThemeMode(String mode) async {
    themeMode = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('themeMode', mode);
    notifyListeners();
  }

  Future<void> lockChannel(String id) async {
    if (!lockedChannels.contains(id)) {
      lockedChannels.add(id);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('lockedChannels', json.encode(lockedChannels));
      notifyListeners();
    }
  }

  Future<void> unlockChannel(String id) async {
    if (lockedChannels.contains(id)) {
      lockedChannels.remove(id);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('lockedChannels', json.encode(lockedChannels));
      notifyListeners();
    }
  }

  bool isChannelLocked(String id) {
    return lockedChannels.contains(id);
  }
}
