import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

class StorageService {
  Future<String> get _localPath async {
    final directory = await getApplicationDocumentsDirectory();
    return directory.path;
  }

  Future<File> _localFile(String filename) async {
    final path = await _localPath;
    return File('$path/$filename');
  }

  // Top-level functions for compute isolate
  static String _encodeJson(dynamic data) => json.encode(data);
  static dynamic _decodeJson(String data) => json.decode(data);

  Future<void> saveLargeData(String filename, dynamic data) async {
    if (kIsWeb) {
      // For web, we might need a different approach (IndexedDB or just localStorage if it fits)
      // For this PoC, we will ignore large file saves on web, as standard shared_prefs will choke on 50MB
      return;
    }

    try {
      final file = await _localFile(filename);
      // Offload heavy JSON stringification to background isolate
      final jsonString = await compute(_encodeJson, data);
      await file.writeAsString(jsonString);
    } catch (e) {
      debugPrint('Error saving large data $filename: $e');
    }
  }

  Future<dynamic> loadLargeData(String filename) async {
    if (kIsWeb) return null;

    try {
      final file = await _localFile(filename);
      if (await file.exists()) {
        final contents = await file.readAsString();
        // Offload heavy JSON parsing to background isolate
        return await compute(_decodeJson, contents);
      }
    } catch (e) {
      debugPrint('Error loading large data $filename: $e');
    }
    return null;
  }

  Future<void> clearLargeData(String filename) async {
    if (kIsWeb) return;

    try {
      final file = await _localFile(filename);
      if (await file.exists()) {
        await file.delete();
      }
    } catch (e) {
      debugPrint('Error clearing large data $filename: $e');
    }
  }
}
