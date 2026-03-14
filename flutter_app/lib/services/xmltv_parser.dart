import 'package:xml/xml.dart';
import 'package:http/http.dart' as http;
import '../models/iptv.dart';
import 'package:intl/intl.dart';

class XMLTVParser {
  final String url;

  XMLTVParser(this.url);

  Future<List<ParsedProgram>> fetchAndParseEPG() async {
    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final document = XmlDocument.parse(response.body);
        final programmes = document.findAllElements('programme');

        List<ParsedProgram> result = [];

        for (var p in programmes) {
          final channelId = p.getAttribute('channel');
          if (channelId == null) continue;

          final startStr = p.getAttribute('start');
          final stopStr = p.getAttribute('stop');

          if (startStr == null || stopStr == null) continue;

          final startMs = parseXmltvDate(startStr);
          final stopMs = parseXmltvDate(stopStr);

          if (startMs == null || stopMs == null) continue;

          final titleNode = p.findElements('title').firstOrNull;
          final descNode = p.findElements('desc').firstOrNull;

          result.add(ParsedProgram(
            start: startMs,
            end: stopMs,
            title_raw: titleNode?.innerText ?? 'Unknown Title',
            description_raw: descNode?.innerText ?? '',
            // We use the channelId directly to group them later, so let's temporarily stash it in start_formatted or create a wrapper.
            // Alternatively, return a tuple or map, but for simplicity we'll just parse them and group by channelId
          ));
        }
        return result;
      }
    } catch (e) {
      print('XMLTV Parse Error: $e');
    }
    return [];
  }

  int? parseXmltvDate(String dateString) {
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

  String formatProgramTime(int timestamp) {
    final date = DateTime.fromMillisecondsSinceEpoch(timestamp);
    return DateFormat('HH:mm').format(date);
  }
}
