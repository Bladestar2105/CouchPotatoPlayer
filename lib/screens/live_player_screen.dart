import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../providers/settings_provider.dart';
import '../services/xtream_service.dart';
import '../models/iptv.dart';

class LivePlayerScreen extends StatefulWidget {
  final String channelName;
  final int streamId;
  final String extension;
  final String type; // 'live', 'vod', or 'series'

  const LivePlayerScreen({
    Key? key,
    required this.channelName,
    required this.streamId,
    this.extension = 'ts',
    this.type = 'live',
  }) : super(key: key);

  @override
  State<LivePlayerScreen> createState() => _LivePlayerScreenState();
}

class _LivePlayerScreenState extends State<LivePlayerScreen> {
  Player? player;
  VideoController? controller;
  int _lastPosition = 0;
  int _duration = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initPlayer();
    });
  }

  void _initPlayer() {
    final provider = Provider.of<AppProvider>(context, listen: false);
    if (provider.config == null) return;

    final xtream = XtreamService(provider.config!);
    String streamUrl;

    if (widget.type == 'vod') {
       streamUrl = xtream.getVodStreamUrl(widget.streamId, extension: widget.extension);
    } else if (widget.type == 'series') {
       streamUrl = xtream.getSeriesStreamUrl(widget.streamId, extension: widget.extension);
    } else {
       streamUrl = xtream.getLiveStreamUrl(widget.streamId, extension: widget.extension);
    }

    if (player == null) {
      final settings = Provider.of<SettingsProvider>(context, listen: false);

      player = Player(
        configuration: PlayerConfiguration(
          bufferSize: settings.bufferSize * 1024 * 1024,
          // MediaKit handles decoder switching internally or via options usually.
          // For now, bufferSize is definitely configurable.
        ),
      );
      controller = VideoController(player!);

      // Force stream to be seekable (especially needed for some MP4/VOD streams)
      if (player?.platform is NativePlayer) {
        (player?.platform as NativePlayer).setProperty('force-seekable', 'yes');
      }

      player?.stream.position.listen((pos) {
        _lastPosition = pos.inMilliseconds;
      });

      player?.stream.duration.listen((dur) {
        _duration = dur.inMilliseconds;
      });

      // Load stream
      player?.open(Media(streamUrl));

      // Trigger a rebuild
      setState(() {});
    }

    _saveToRecentlyWatched();
  }

  void _saveToRecentlyWatched() {
    final provider = Provider.of<AppProvider>(context, listen: false);
    provider.addRecentlyWatched(RecentlyWatchedItem(
      id: widget.streamId.toString(),
      type: widget.type,
      name: widget.channelName,
      extension: widget.extension,
      lastWatchedAt: DateTime.now().millisecondsSinceEpoch,
    ));
  }

  @override
  void dispose() {
    if (player != null && (widget.type == 'vod' || widget.type == 'series')) {
       final provider = Provider.of<AppProvider>(context, listen: false);
       provider.updatePlaybackPosition(
         widget.streamId.toString(),
         _lastPosition,
         duration: _duration > 0 ? _duration : null,
       );
    }
    player?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            Center(
              child: controller != null
                  ? Video(controller: controller!)
                  : const CircularProgressIndicator(),
            ),
            Positioned(
              top: 10,
              left: 10,
              child: IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white, size: 30),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ),
            Positioned(
              top: 20,
              left: 60,
              child: Text(
                widget.channelName,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  shadows: [Shadow(color: Colors.black, blurRadius: 4)],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
