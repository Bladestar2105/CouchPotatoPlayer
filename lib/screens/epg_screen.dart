import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'dart:convert';
import '../providers/app_provider.dart';
import '../utils/platform.dart';
import '../models/iptv.dart';

class EpgScreen extends StatefulWidget {
  final String channelId;
  final String channelName;

  const EpgScreen({
    Key? key,
    required this.channelId,
    required this.channelName,
  }) : super(key: key);

  @override
  State<EpgScreen> createState() => _EpgScreenState();
}

class _EpgScreenState extends State<EpgScreen> {
  List<dynamic> epgData = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _loadEpgData();
  }

  void _loadEpgData() {
    final appProvider = Provider.of<AppProvider>(context, listen: false);

    setState(() {
      epgData = appProvider.epgData[widget.channelId] ?? [];
      loading = false;
    });
  }

  String _decodeBase64IfNeeded(String text) {
    if (text.isEmpty) return text;
    // Simple heuristic to check if it might be base64 from Xtream EPG
    // React Native code did: Buffer.from(item.title || '', 'base64').toString('utf-8').replace(BASE64_PADDING_REGEX, '')
    // Some EPG titles are already plain text. We will try decoding if it looks like base64.
    try {
      if (!text.contains(' ') && text.length % 4 == 0) {
        return utf8.decode(base64Decode(text));
      }
    } catch (_) {
      // Not valid base64 or utf8
    }
    return text;
  }

  String _formatTime(dynamic timestamp) {
    if (timestamp is int) {
      // Assume timestamp is in seconds if it's 10 digits, milliseconds if 13
      int ms = timestamp;
      if (timestamp < 10000000000) {
        ms = timestamp * 1000;
      }
      final date = DateTime.fromMillisecondsSinceEpoch(ms);
      return DateFormat('HH:mm').format(date);
    } else if (timestamp is String) {
      // Try to parse string timestamp
      final intTime = int.tryParse(timestamp);
      if (intTime != null) {
        return _formatTime(intTime);
      }
      return timestamp; // Return as is if we can't parse it
    }
    return '';
  }

  Widget _buildEpgItem(dynamic item, bool isMobileLayout) {
    bool isNow = false;
    String title = 'Unknown Title';
    String description = '';
    String startStr = '';
    String endStr = '';

    final nowTime = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    if (item is ParsedProgram) {
      // This is our native ParsedProgram format
      isNow = nowTime >= item.start && nowTime < item.end;
      title = item.title_raw;
      description = item.description_raw;
      startStr = _formatTime(item.start);
      endStr = _formatTime(item.end);
    } else if (item is Map<String, dynamic>) {
      // Fallback for raw Xtream EPG maps
      if (item.containsKey('title_raw')) {
        final start = item['start'];
        final end = item['end'];
        if (start is int && end is int) {
           isNow = start <= nowTime && end > nowTime;
           startStr = _formatTime(start);
           endStr = _formatTime(end);
        } else if (start is String) {
           final startInt = int.tryParse(start);
           final endInt = int.tryParse(item['end'].toString());
           if (startInt != null && endInt != null) {
              isNow = startInt <= nowTime && endInt > nowTime;
              startStr = _formatTime(startInt);
              endStr = _formatTime(endInt);
           }
        }
        title = item['title_raw'] ?? 'Unknown Title';
        description = item['description_raw'] ?? '';
      } else {
        // Base64 encoded xtream format
        isNow = item['has_archive'] == 0; // rough approximation from original RN code
        title = _decodeBase64IfNeeded(item['title'] ?? '');
        description = _decodeBase64IfNeeded(item['description'] ?? '');
        startStr = item['start']?.toString() ?? '';
        endStr = item['end']?.toString() ?? '';
      }
    }

    final bgColor = isNow ? Colors.blue : const Color(0xFF1C1C1E);
    final borderColor = isNow ? Colors.blue : const Color(0xFF2C2C2E);
    final timeColor = isNow ? Colors.white : Colors.grey;
    final titleColor = isNow ? Colors.white : const Color(0xFFE5E5E5);

    if (isMobileLayout) {
      return Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.access_time, size: 14, color: timeColor),
                const SizedBox(width: 6),
                Text(
                  '$startStr – $endStr',
                  style: TextStyle(
                    color: timeColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              title,
              style: TextStyle(
                color: titleColor,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            if (description.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                description,
                style: const TextStyle(
                  color: Colors.grey,
                  fontSize: 13,
                  height: 1.4,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      );
    }

    // TV Layout
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(25),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.access_time, size: 20, color: timeColor),
              const SizedBox(width: 10),
              Text(
                '$startStr - $endStr',
                style: TextStyle(
                  color: timeColor,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: TextStyle(
              color: titleColor,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          if (description.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              description,
              style: const TextStyle(
                color: Colors.grey,
                fontSize: 16,
                height: 1.5,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool mobile = isMobile(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      body: SafeArea(
        top: mobile,
        child: Column(
          children: [
            // Header
            Container(
              padding: mobile
                  ? const EdgeInsets.symmetric(horizontal: 16, vertical: 14)
                  : const EdgeInsets.only(top: 40, left: 40, right: 40, bottom: 20),
              decoration: const BoxDecoration(
                color: Color(0xFF1C1C1E),
                border: Border(bottom: BorderSide(color: Color(0xFF2C2C2E))),
              ),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Back',
                    icon: Icon(
                      Icons.chevron_left,
                      color: Colors.white,
                      size: mobile ? 28 : 40,
                    ),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  SizedBox(width: mobile ? 12 : 16),
                  Expanded(
                    child: Text(
                      'TV Guide - ${widget.channelName}',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: mobile ? 20 : 32,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),

            // Content
            Expanded(
              child: loading
                  ? const Center(child: CircularProgressIndicator())
                  : epgData.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.calendar_today,
                                size: mobile ? 48 : 64,
                                color: const Color(0xFF444444),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No programming information available.',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: mobile ? 16 : 20,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: EdgeInsets.all(mobile ? 16.0 : 40.0),
                          itemCount: epgData.length,
                          itemBuilder: (context, index) {
                            return _buildEpgItem(epgData[index], mobile);
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
