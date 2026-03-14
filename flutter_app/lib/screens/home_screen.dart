import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/app_provider.dart';
import '../services/xtream_service.dart';
import '../models/iptv.dart' as iptv;
import '../models/iptv.dart' hide Category;
import 'live_player_screen.dart';
import 'media_info_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String activeTab = 'live';
  String? selectedCategoryId;
  bool loading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  Future<void> _loadData() async {
    final appProvider = Provider.of<AppProvider>(context, listen: false);
    if (appProvider.config == null || appProvider.config!.type != 'xtream') return;

    setState(() {
      loading = true;
      selectedCategoryId = null;
    });

    try {
      final xtream = XtreamService(appProvider.config!);
      List<iptv.Category> cats = [];

      if (activeTab == 'vod') {
        cats = await xtream.getVodCategories();
      } else if (activeTab == 'series') {
        cats = await xtream.getSeriesCategories();
      } else {
        cats = await xtream.getLiveCategories();
      }

      await appProvider.setCategories(cats);
    } catch (e) {
      debugPrint('Error loading categories: $e');
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  Future<void> _loadChannels(String categoryId) async {
    final appProvider = Provider.of<AppProvider>(context, listen: false);
    if (appProvider.config == null || appProvider.config!.type != 'xtream') return;

    setState(() {
      loading = true;
      selectedCategoryId = categoryId;
    });

    try {
      final xtream = XtreamService(appProvider.config!);
      List<LiveChannel> chans = [];

      if (activeTab == 'vod') {
        chans = await xtream.getVodStreams(categoryId);
      } else if (activeTab == 'series') {
        chans = await xtream.getSeries(categoryId);
      } else {
        chans = await xtream.getLiveStreams(categoryId);
      }

      await appProvider.setChannels(chans);
    } catch (e) {
      debugPrint('Error loading channels: $e');
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  Widget _buildTabBar() {
    return Container(
      color: const Color(0xFF1C1C1E),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: ['live', 'vod', 'series', 'settings'].map((tab) {
          if (tab == 'settings') {
            return IconButton(
              icon: const Icon(Icons.settings, color: Colors.grey),
              onPressed: () {
                Navigator.pushNamed(context, '/settings');
              },
            );
          }

          final isSelected = activeTab == tab;
          String label = tab == 'live' ? 'Live' : (tab == 'vod' ? 'Movies' : 'Series');
          IconData icon = tab == 'live' ? Icons.tv : (tab == 'vod' ? Icons.movie : Icons.list);

          return Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() => activeTab = tab);
                _loadData();
              },
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.blue : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icon, color: isSelected ? Colors.white : Colors.grey, size: 18),
                    const SizedBox(width: 6),
                    Text(
                      label,
                      style: TextStyle(
                        color: isSelected ? Colors.white : Colors.grey,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList().cast<Widget>(),
      ),
    );
  }

  Widget _buildCategories(AppProvider provider) {
    if (loading && provider.categories.isEmpty) {
      return const SizedBox(height: 52, child: Center(child: CircularProgressIndicator()));
    }

    return Container(
      height: 52,
      color: const Color(0xFF151515),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: provider.categories.length,
        itemBuilder: (context, index) {
          final cat = provider.categories[index];
          final isSelected = cat.category_id == selectedCategoryId;

          return GestureDetector(
            onTap: () => _loadChannels(cat.category_id),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? Colors.blue : const Color(0xFF2C2C2E),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                cat.category_name,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.grey,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLiveList(AppProvider provider) {
    return ListView.builder(
      itemCount: provider.channels.length,
      itemBuilder: (context, index) {
        final chan = provider.channels[index];
        return ListTile(
          leading: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFF2C2C2E),
              borderRadius: BorderRadius.circular(8),
            ),
            child: chan.stream_icon != null && chan.stream_icon!.isNotEmpty
                ? CachedNetworkImage(
                    imageUrl: chan.stream_icon!,
                    fit: BoxFit.cover,
                    errorWidget: (context, url, error) => const Icon(Icons.tv, color: Colors.grey),
                  )
                : const Icon(Icons.tv, color: Colors.grey),
          ),
          title: Text(
            chan.name,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          onTap: () {
            if (chan.stream_id != null) {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => LivePlayerScreen(
                    channelName: chan.name,
                    streamId: chan.stream_id!,
                    extension: 'm3u8',
                    type: 'live',
                  ),
                ),
              );
            }
          },
        );
      },
    );
  }

  Widget _buildGrid(AppProvider provider) {
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 2 / 3,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: provider.channels.length,
      itemBuilder: (context, index) {
        final chan = provider.channels[index];
        final imageUrl = chan.stream_icon ?? chan.cover;
        final name = chan.name.isNotEmpty ? chan.name : chan.title ?? 'Unknown';

        return GestureDetector(
          onTap: () {
             final id = activeTab == 'series' ? chan.series_id : chan.stream_id;
             if (id != null) {
               Navigator.push(
                 context,
                 MaterialPageRoute(
                   builder: (_) => MediaInfoScreen(
                     id: id,
                     type: activeTab,
                     title: name,
                     cover: imageUrl,
                     extension: chan.container_extension ?? 'mp4',
                   ),
                 ),
               );
             }
          },
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFF1C1C1E),
              borderRadius: BorderRadius.circular(8),
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              fit: StackFit.expand,
              children: [
                imageUrl != null && imageUrl.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imageUrl,
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) => const Icon(Icons.movie, color: Colors.grey, size: 32),
                      )
                    : const Icon(Icons.movie, color: Colors.grey, size: 32),
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    color: Colors.black54,
                    padding: const EdgeInsets.all(4),
                    child: Text(
                      name,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildContent(AppProvider provider) {
    if (loading && provider.channels.isEmpty) {
      return const Expanded(child: Center(child: CircularProgressIndicator()));
    }

    if (selectedCategoryId == null) {
      return const Expanded(
        child: Center(
          child: Text(
            'Select a category to view items',
            style: TextStyle(color: Colors.grey, fontSize: 16),
          ),
        ),
      );
    }

    if (provider.channels.isEmpty) {
       return const Expanded(
        child: Center(
          child: Text(
            'No items found in this category',
            style: TextStyle(color: Colors.grey, fontSize: 16),
          ),
        ),
      );
    }

    if (activeTab == 'live') {
      return Expanded(child: _buildLiveList(provider));
    } else {
      return Expanded(child: _buildGrid(provider));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      body: SafeArea(
        child: Column(
          children: [
            _buildTabBar(),
            Consumer<AppProvider>(
              builder: (context, provider, child) {
                return Column(
                  children: [
                    _buildCategories(provider),
                  ],
                );
              },
            ),
            Consumer<AppProvider>(
              builder: (context, provider, child) {
                return _buildContent(provider);
              },
            ),
          ],
        ),
      ),
    );
  }
}
