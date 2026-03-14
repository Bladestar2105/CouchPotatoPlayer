import 'dart:async';
import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../providers/settings_provider.dart';
import '../services/xtream_service.dart';
import '../models/iptv.dart';
import '../utils/epg.dart';

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
  bool _showOverlay = false;
  Timer? _hideTimer;
  ParsedProgram? _currentProgram;
  ParsedProgram? _nextProgram;

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

    _loadEpgData(provider);

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

  void _loadEpgData(AppProvider provider) {
    if (widget.type != 'live') return;

    final liveChannel = provider.channels.cast<LiveChannel?>().firstWhere(
      (c) => c?.stream_id == widget.streamId,
      orElse: () => null,
    );

    if (liveChannel != null) {
      final epgKey = getEpgKey(liveChannel);
      final programs = provider.epgData[epgKey] ?? [];
      final nowTime = DateTime.now().millisecondsSinceEpoch ~/ 1000;

      for (int i = 0; i < programs.length; i++) {
        final prog = programs[i];
        if (nowTime >= prog.start && nowTime < prog.end) {
          _currentProgram = prog;
          if (i + 1 < programs.length) {
            _nextProgram = programs[i + 1];
          }
          break;
        }
      }
    }
  }

  void _toggleOverlay() {
    setState(() {
      _showOverlay = !_showOverlay;
    });

    _hideTimer?.cancel();
    if (_showOverlay) {
      _hideTimer = Timer(const Duration(seconds: 3), () {
        if (mounted) {
          setState(() {
            _showOverlay = false;
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _hideTimer?.cancel();
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
        child: GestureDetector(
          onTap: _toggleOverlay,
          child: Stack(
            children: [
              Center(
                child: controller != null
                    ? Video(controller: controller!)
                    : const CircularProgressIndicator(),
              ),
              if (_showOverlay) ...[
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.black87, Colors.transparent],
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_back, color: Colors.white, size: 30),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
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
                ),
                if (widget.type == 'live' && (_currentProgram != null || _nextProgram != null))
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.bottomCenter,
                          end: Alignment.topCenter,
                          colors: [Colors.black87, Colors.transparent],
                        ),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_currentProgram != null) ...[
                            const Text('Now Playing', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text(
                              _currentProgram!.title_raw,
                              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              "${DateTime.fromMillisecondsSinceEpoch(_currentProgram!.start * 1000).hour.toString().padLeft(2, '0')}:${DateTime.fromMillisecondsSinceEpoch(_currentProgram!.start * 1000).minute.toString().padLeft(2, '0')} - ${DateTime.fromMillisecondsSinceEpoch(_currentProgram!.end * 1000).hour.toString().padLeft(2, '0')}:${DateTime.fromMillisecondsSinceEpoch(_currentProgram!.end * 1000).minute.toString().padLeft(2, '0')}",
                              style: const TextStyle(color: Colors.grey, fontSize: 14),
                            ),
                          ],
                          if (_nextProgram != null) ...[
                            const SizedBox(height: 12),
                            const Text('Next', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text(
                              _nextProgram!.title_raw,
                              style: const TextStyle(color: Colors.white70, fontSize: 16),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              "${DateTime.fromMillisecondsSinceEpoch(_nextProgram!.start * 1000).hour.toString().padLeft(2, '0')}:${DateTime.fromMillisecondsSinceEpoch(_nextProgram!.start * 1000).minute.toString().padLeft(2, '0')} - ${DateTime.fromMillisecondsSinceEpoch(_nextProgram!.end * 1000).hour.toString().padLeft(2, '0')}:${DateTime.fromMillisecondsSinceEpoch(_nextProgram!.end * 1000).minute.toString().padLeft(2, '0')}",
                              style: const TextStyle(color: Colors.grey, fontSize: 14),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
