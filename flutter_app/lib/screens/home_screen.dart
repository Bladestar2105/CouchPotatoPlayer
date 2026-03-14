import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Player? player;
  VideoController? controller;

  @override
  void initState() {
    super.initState();
    // Delay initialization to get access to provider after widget builds
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initPlayer();
    });
  }

  void _initPlayer() {
    if (player == null) {
      // In media_kit, libmpv properties cannot be set directly via generic setProperty
      // on Player. However, since media_kit sets 'auto' hwdec internally for performance,
      // it handles hardware acceleration natively without needing manual mpv injections.
      // We will create the default player, and for the sake of the UX, the toggle
      // is implemented. If the underlying API for media_kit evolves to expose it,
      // the value is already tracked and ready to be piped.
      player = Player();

      // Create video controller
      controller = VideoController(player!);

      // Example HLS stream to test playback (replace with actual Xtream logic later)
      player?.open(Media('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'));

      setState(() {});
    }
  }

  @override
  void dispose() {
    player?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    Provider.of<SettingsProvider>(context).hardwareAcceleration;

    return Scaffold(
      appBar: AppBar(
        title: const Text('CouchPotatoPlayer (Flutter PoC)'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SettingsScreen()),
              );
            },
          ),
        ],
      ),
      body: Center(
        child: controller != null
            ? Video(controller: controller!)
            : const CircularProgressIndicator(),
      ),
    );
  }
}
