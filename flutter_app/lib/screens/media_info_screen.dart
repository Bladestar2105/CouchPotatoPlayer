import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/app_provider.dart';
import '../services/xtream_service.dart';
import '../models/iptv.dart';
import 'live_player_screen.dart';

class MediaInfoScreen extends StatefulWidget {
  final int id;
  final String type; // 'vod' or 'series'
  final String title;
  final String? cover;
  final String extension;

  const MediaInfoScreen({
    Key? key,
    required this.id,
    required this.type,
    required this.title,
    this.cover,
    this.extension = 'mp4',
  }) : super(key: key);

  @override
  State<MediaInfoScreen> createState() => _MediaInfoScreenState();
}

class _MediaInfoScreenState extends State<MediaInfoScreen> {
  bool loading = true;
  Map<String, dynamic>? mediaInfo;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadMediaInfo();
    });
  }

  Future<void> _loadMediaInfo() async {
    final provider = Provider.of<AppProvider>(context, listen: false);
    if (provider.config == null || provider.config!.type != 'xtream') return;

    final xtream = XtreamService(provider.config!);
    try {
      if (widget.type == 'series') {
        mediaInfo = await xtream.getSeriesInfo(widget.id);
      } else {
        mediaInfo = await xtream.getVodInfo(widget.id);
      }
    } catch (e) {
      debugPrint('Failed to load media info: $e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(widget.title),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 150,
                        height: 225,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          color: const Color(0xFF1C1C1E),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: widget.cover != null && widget.cover!.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: widget.cover!,
                                fit: BoxFit.cover,
                                errorWidget: (context, url, error) => const Icon(Icons.movie, size: 64, color: Colors.grey),
                              )
                            : const Icon(Icons.movie, size: 64, color: Colors.grey),
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.title,
                              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            const SizedBox(height: 10),
                            if (mediaInfo?['info']?['plot'] != null)
                              Text(
                                mediaInfo!['info']['plot'],
                                style: const TextStyle(fontSize: 14, color: Colors.grey),
                                maxLines: 6,
                                overflow: TextOverflow.ellipsis,
                              ),
                            const SizedBox(height: 20),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                icon: const Icon(Icons.play_arrow, color: Colors.white),
                                label: const Text('Play', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                                onPressed: () {
                                  // For series, we would need to pick an episode. For simplicity of PoC, play the first if available.
                                  int streamId = widget.id;
                                  String ext = widget.extension;

                                  if (widget.type == 'series' && mediaInfo != null && mediaInfo!['episodes'] != null) {
                                     // Get first episode from first season
                                     final episodesMap = mediaInfo!['episodes'] as Map<String, dynamic>;
                                     if (episodesMap.isNotEmpty) {
                                       final firstSeasonKey = episodesMap.keys.first;
                                       final firstEpisode = episodesMap[firstSeasonKey][0];
                                       streamId = int.parse(firstEpisode['id'].toString());
                                       ext = firstEpisode['container_extension'] ?? 'mp4';
                                     }
                                  }

                                  // Update recently watched list with this item when play is clicked
                                  final provider = Provider.of<AppProvider>(context, listen: false);
                                  provider.addRecentlyWatched(RecentlyWatchedItem(
                                    id: widget.id.toString(),
                                    type: widget.type,
                                    name: widget.title,
                                    icon: widget.cover,
                                    extension: ext,
                                    lastWatchedAt: DateTime.now().millisecondsSinceEpoch,
                                  ));

                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => LivePlayerScreen(
                                        channelName: widget.title,
                                        streamId: streamId,
                                        extension: ext,
                                        type: widget.type,
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }
}
