import 'package:xml/xml.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import '../models/iptv.dart';
import 'package:intl/intl.dart';

// Top-level function for isolate
List<ParsedProgram> _parseXmltv(String xmlBody) {
  final document = XmlDocument.parse(xmlBody);
  final programmes = document.findAllElements('programme');

  List<ParsedProgram> result = [];

  for (var p in programmes) {
    final channelId = p.getAttribute('channel');
    if (channelId == null) continue;

    final startStr = p.getAttribute('start');
    final stopStr = p.getAttribute('stop');

    if (startStr == null || stopStr == null) continue;

    final startMs = _parseXmltvDate(startStr);
    final stopMs = _parseXmltvDate(stopStr);

    if (startMs == null || stopMs == null) continue;

    final titleNode = p.findElements('title').firstOrNull;
    final descNode = p.findElements('desc').firstOrNull;

    result.add(ParsedProgram(
      start: startMs ~/ 1000,
      end: stopMs ~/ 1000,
      title_raw: titleNode?.innerText ?? 'Unknown Title',
      description_raw: descNode?.innerText ?? '',
      start_formatted: channelId, // temporarily store channelId in start_formatted to group later
    ));
  }
  return result;
}

int? _parseXmltvDate(String dateString) {
  if (dateString.length < 14) return null;

  // Format: YYYYMMDDHHmmss +HHMM
  try {
    final year = int.parse(dateString.substring(0, 4));
    final month = int.parse(dateString.substring(4, 6));
    final day = int.parse(dateString.substring(6, 8));
    final hour = int.parse(dateString.substring(8, 10));
    final min = int.parse(dateString.substring(10, 12));
    final sec = int.parse(dateString.substring(12, 14));

    DateTime date = DateTime.utc(year, month, day, hour, min, sec);

    if (dateString.length >= 19) {
      final offsetSign = dateString.substring(15, 16);
      final offsetHour = int.parse(dateString.substring(16, 18));
      final offsetMin = int.parse(dateString.substring(18, 20));

      int totalOffsetMinutes = (offsetHour * 60) + offsetMin;
      if (offsetSign == '+') {
        date = date.subtract(Duration(minutes: totalOffsetMinutes));
      } else if (offsetSign == '-') {
        date = date.add(Duration(minutes: totalOffsetMinutes));
      }
    }

    return date.millisecondsSinceEpoch;
  } catch (e) {
    return null;
  }
}

class XMLTVParser {
  final String url;

  XMLTVParser(this.url);

  Future<List<ParsedProgram>> fetchAndParseEPG() async {
    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        // Offload heavy XML parsing to a background isolate
        return await compute(_parseXmltv, response.body);
      }
    } catch (e) {
      debugPrint('XMLTV Parse Error: $e');
    }
    return [];
  }

  Future<Map<String, List<ParsedProgram>>> getGroupedEpg() async {
    final programs = await fetchAndParseEPG();
    Map<String, List<ParsedProgram>> grouped = {};
    for (var p in programs) {
      final channelId = p.start_formatted ?? '';
      if (channelId.isNotEmpty) {
        if (!grouped.containsKey(channelId)) {
          grouped[channelId] = [];
        }
        // clear the temporary channel id
        grouped[channelId]!.add(ParsedProgram(
          start: p.start,
          end: p.end,
          title_raw: p.title_raw,
          description_raw: p.description_raw,
        ));
      }
    }
    // Sort each list by start time
    grouped.forEach((key, list) {
      list.sort((a, b) => a.start.compareTo(b.start));
    });
    return grouped;
  }

  int? parseXmltvDate(String dateString) => _parseXmltvDate(dateString);

  String formatProgramTime(int timestamp) {
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp);
    return DateFormat('HH:mm').format(date);
  }
}
