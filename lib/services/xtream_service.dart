import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import '../models/iptv.dart' as iptv;
import '../models/iptv.dart' hide Category;

class XtreamService {
  final PlayerConfig config;
  late final String baseUrl;

  XtreamService(this.config) {
    String trimmedUrl = config.serverUrl.trim();
    if (trimmedUrl.endsWith('/')) {
      trimmedUrl = trimmedUrl.substring(0, trimmedUrl.length - 1);
    }
    baseUrl = trimmedUrl;
  }

  String _proxyUrl(String url) {
    if (kIsWeb) {
      String cleanUrl = url;
      while (cleanUrl.startsWith('/') || cleanUrl.startsWith('proxy')) {
        cleanUrl = cleanUrl.replaceFirst(RegExp(r'^/+'), '').replaceFirst(RegExp(r'^proxy/?'), '');
      }
      return '/proxy/$cleanUrl';
    }
    return url;
  }

  String _buildUrl(String action, [Map<String, String>? extraParams]) {
    final params = {
      'username': config.username.trim(),
      'password': config.password.trim(),
      'action': action,
      ...?extraParams,
    };

    final uri = Uri.parse('$baseUrl/player_api.php').replace(queryParameters: params);
    return _proxyUrl(uri.toString());
  }

  Future<bool> checkCompatibility() async {
    try {
      final uri = Uri.parse('$baseUrl/player_api.php?action=cpp');
      final response = await http.get(Uri.parse(_proxyUrl(uri.toString()))).timeout(const Duration(seconds: 5));
      return response.body == 'true';
    } catch (e) {
      return false;
    }
  }

  Future<Map<String, dynamic>> authenticate() async {
    try {
      final username = Uri.encodeComponent(config.username.trim());
      final password = Uri.encodeComponent(config.password.trim());
      final uri = Uri.parse('$baseUrl/player_api.php?username=$username&password=$password');
      final response = await http.get(Uri.parse(_proxyUrl(uri.toString())));
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to authenticate');
      }
    } catch (e) {
      debugPrint('Xtream Auth Error: $e');
      throw Exception(e.toString());
    }
  }

  Future<List<iptv.Category>> getLiveCategories() async {
    try {
      final response = await http.get(Uri.parse(_buildUrl('get_live_categories')));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((item) => iptv.Category.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Xtream Get Categories Error: $e');
      throw Exception(e.toString());
    }
  }

  Future<List<LiveChannel>> getLiveStreams([String? categoryId]) async {
    try {
      final params = categoryId != null ? {'category_id': categoryId} : null;
      final response = await http.get(Uri.parse(_buildUrl('get_live_streams', params)));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((item) => LiveChannel.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Xtream Get Streams Error: $e');
      throw Exception(e.toString());
    }
  }

  Future<List<iptv.Category>> getVodCategories() async {
    try {
      final response = await http.get(Uri.parse(_buildUrl('get_vod_categories')));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((item) => iptv.Category.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Xtream Get VOD Categories Error: $e');
      throw Exception(e.toString());
    }
  }

  Future<List<LiveChannel>> getVodStreams([String? categoryId]) async {
    try {
      final params = categoryId != null ? {'category_id': categoryId} : null;
      final response = await http.get(Uri.parse(_buildUrl('get_vod_streams', params)));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((item) => LiveChannel.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Xtream Get VOD Streams Error: $e');
      throw Exception(e.toString());
    }
  }

  Future<List<iptv.Category>> getSeriesCategories() async {
    try {
      final response = await http.get(Uri.parse(_buildUrl('get_series_categories')));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((item) => iptv.Category.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Xtream Get Series Categories Error: $e');
      throw Exception(e.toString());
    }
  }

  Future<List<LiveChannel>> getSeries([String? categoryId]) async {
    try {
      final params = categoryId != null ? {'category_id': categoryId} : null;
      final response = await http.get(Uri.parse(_buildUrl('get_series', params)));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((item) => LiveChannel.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Xtream Get Series Error: $e');
      throw Exception(e.toString());
    }
  }

  Future<Map<String, dynamic>> getVodInfo(int vodId) async {
    try {
      final response = await http.get(Uri.parse(_buildUrl('get_vod_info', {'vod_id': vodId.toString()})));
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      throw Exception('Failed to get VOD info');
    } catch (e) {
      debugPrint('Xtream Get VOD Info Error: $e');
      throw Exception(e.toString());
    }
  }

  Future<Map<String, dynamic>> getSeriesInfo(int seriesId) async {
    try {
      final response = await http.get(Uri.parse(_buildUrl('get_series_info', {'series_id': seriesId.toString()})));
      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      throw Exception('Failed to get Series info');
    } catch (e) {
      debugPrint('Xtream Get Series Info Error: $e');
      throw Exception(e.toString());
    }
  }

  String getXmltvUrl() {
    final username = Uri.encodeComponent(config.username.trim());
    final password = Uri.encodeComponent(config.password.trim());
    final url = '$baseUrl/xmltv.php?username=$username&password=$password';
    return _proxyUrl(url);
  }

  String getLiveStreamUrl(int streamId, {String extension = 'ts'}) {
    final username = Uri.encodeComponent(config.username.trim());
    final password = Uri.encodeComponent(config.password.trim());
    final url = '$baseUrl/live/$username/$password/$streamId.$extension';
    return _proxyUrl(url);
  }

  String getVodStreamUrl(int streamId, {String extension = 'mp4'}) {
    final username = Uri.encodeComponent(config.username.trim());
    final password = Uri.encodeComponent(config.password.trim());
    final url = '$baseUrl/movie/$username/$password/$streamId.$extension';
    return _proxyUrl(url);
  }

  String getSeriesStreamUrl(int streamId, {String extension = 'mp4'}) {
    final username = Uri.encodeComponent(config.username.trim());
    final password = Uri.encodeComponent(config.password.trim());
    final url = '$baseUrl/series/$username/$password/$streamId.$extension';
    return _proxyUrl(url);
  }
}
