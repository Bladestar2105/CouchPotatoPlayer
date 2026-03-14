import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/app_provider.dart';
import '../services/xtream_service.dart';
import 'dart:async';
import '../models/iptv.dart' as iptv;
import '../models/iptv.dart' hide Category;
import '../utils/epg.dart';
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
  int nowTime = DateTime.now().millisecondsSinceEpoch ~/ 1000;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(minutes: 1), (timer) {
      if (mounted) {
        setState(() {
          nowTime = DateTime.now().millisecondsSinceEpoch ~/ 1000;
        });
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadData() async {
    final appProvider = Provider.of<AppProvider>(context, listen: false);
    if (appProvider.config == null || appProvider.config!.type != 'xtream') return;

    if (activeTab == 'favorites') {
      setState(() {
        selectedCategoryId = null;
        loading = false;
      });
      return;
    }

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

      // Filter adult categories if not showing adult content
      if (!appProvider.showAdult) {
        cats = cats.where((c) => c.adult != 1).toList();
      }

      await appProvider.setCategories(cats);
    } catch (e) {
      debugPrint('Error loading categories: $e');
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
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
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
    }
  }

  Widget _buildTabBar() {
    return Container(
      color: const Color(0xFF1C1C1E),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: ['live', 'vod', 'series', 'favorites', 'recents', 'settings'].map((tab) {
          if (tab == 'settings') {
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.search, color: Colors.grey),
                  onPressed: () {
                    Navigator.pushNamed(context, '/search');
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.settings, color: Colors.grey),
                  onPressed: () {
                    Navigator.pushNamed(context, '/settings');
                  },
                ),
              ],
            );
          }

          final isSelected = activeTab == tab;
          String label = tab == 'live' ? 'Live' : (tab == 'vod' ? 'Movies' : (tab == 'series' ? 'Series' : (tab == 'recents' ? 'Recents' : 'Favorites')));
          IconData icon = tab == 'live' ? Icons.tv : (tab == 'vod' ? Icons.movie : (tab == 'series' ? Icons.list : (tab == 'recents' ? Icons.history : Icons.favorite)));

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
                      overflow: TextOverflow.ellipsis,
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
    if (activeTab == 'favorites' || activeTab == 'recents') return const SizedBox.shrink();

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
    return RefreshIndicator(
      onRefresh: () async {
        if (selectedCategoryId != null) {
          await _loadChannels(selectedCategoryId!);
        }
      },
      child: ListView.builder(
        itemCount: provider.channels.length,
        itemBuilder: (context, index) {
          final chan = provider.channels[index];
          final isFav = provider.isFavorite(chan.stream_id.toString());

          final epgKey = getEpgKey(chan);
          final programs = provider.epgData[epgKey] ?? [];
          final currentProgIndex = findCurrentProgramIndex(programs, nowTime);
          final currentProg = currentProgIndex != -1 ? programs[currentProgIndex] : null;
          final nextProg = (currentProgIndex != -1 && currentProgIndex + 1 < programs.length) ? programs[currentProgIndex + 1] : null;

          double progress = 0.0;
          if (currentProg != null) {
            final total = currentProg.end - currentProg.start;
            final elapsed = nowTime - currentProg.start;
            if (total > 0) {
              progress = (elapsed / total).clamp(0.0, 1.0);
            }
          }

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
            subtitle: currentProg != null ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text(
                  currentProg.title_raw,
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                LinearProgressIndicator(
                  value: progress,
                  backgroundColor: const Color(0xFF2C2C2E),
                  color: Colors.blue,
                  minHeight: 2,
                ),
                if (nextProg != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    'Next: ${nextProg.title_raw}',
                    style: const TextStyle(color: Colors.white54, fontSize: 10),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ) : null,
            trailing: IconButton(
              icon: Icon(
                isFav ? Icons.favorite : Icons.favorite_border,
                color: isFav ? Colors.red : Colors.grey,
              ),
              onPressed: () {
                if (isFav) {
                  provider.removeFavorite(chan.stream_id.toString());
                } else {
                  provider.addFavorite(iptv.FavoriteItem(
                    id: chan.stream_id.toString(),
                    type: 'live',
                    name: chan.name,
                    icon: chan.stream_icon,
                    categoryId: chan.category_id,
                    addedAt: DateTime.now().millisecondsSinceEpoch,
                  ));
                }
              },
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
      ),
    );
  }

  Widget _buildGrid(AppProvider provider) {
    return RefreshIndicator(
      onRefresh: () async {
        if (selectedCategoryId != null) {
          await _loadChannels(selectedCategoryId!);
        }
      },
      child: GridView.builder(
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
          final id = (activeTab == 'series' ? chan.series_id : chan.stream_id)?.toString() ?? '';
          final isFav = provider.isFavorite(id);

          return GestureDetector(
            onTap: () {
               if (id.isNotEmpty) {
                 Navigator.push(
                   context,
                   MaterialPageRoute(
                     builder: (_) => MediaInfoScreen(
                       id: int.parse(id),
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
                  Positioned(
                    top: 4,
                    right: 4,
                    child: Container(
                      decoration: const BoxDecoration(
                        color: Colors.black54,
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: Icon(
                          isFav ? Icons.favorite : Icons.favorite_border,
                          color: isFav ? Colors.red : Colors.white,
                          size: 20,
                        ),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () {
                          if (isFav) {
                            provider.removeFavorite(id);
                          } else {
                            provider.addFavorite(iptv.FavoriteItem(
                              id: id,
                              type: activeTab,
                              name: name,
                              icon: imageUrl,
                              categoryId: chan.category_id,
                              addedAt: DateTime.now().millisecondsSinceEpoch,
                            ));
                          }
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFavoritesGrid(AppProvider provider) {
    if (provider.favorites.isEmpty) {
      return const Expanded(
        child: Center(
          child: Text(
            'No favorites added yet.',
            style: TextStyle(color: Colors.grey, fontSize: 16),
          ),
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 2 / 3,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: provider.favorites.length,
      itemBuilder: (context, index) {
        final fav = provider.favorites[index];
        final imageUrl = fav.icon;
        final name = fav.name;

        return GestureDetector(
          onTap: () {
            if (fav.type == 'live') {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => LivePlayerScreen(
                    channelName: name,
                    streamId: int.tryParse(fav.id) ?? 0,
                    extension: 'm3u8',
                    type: 'live',
                  ),
                ),
              );
            } else {
               Navigator.push(
                 context,
                 MaterialPageRoute(
                   builder: (_) => MediaInfoScreen(
                     id: int.tryParse(fav.id) ?? 0,
                     type: fav.type,
                     title: name,
                     cover: imageUrl,
                     extension: 'mp4',
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
                        errorWidget: (context, url, error) => Icon(fav.type == 'live' ? Icons.tv : Icons.movie, color: Colors.grey, size: 32),
                      )
                    : Icon(fav.type == 'live' ? Icons.tv : Icons.movie, color: Colors.grey, size: 32),
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
                Positioned(
                  top: 4,
                  right: 4,
                  child: Container(
                    decoration: const BoxDecoration(
                      color: Colors.black54,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.favorite, color: Colors.red, size: 20),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () {
                        provider.removeFavorite(fav.id);
                      },
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


  Widget _buildRecentsGrid(AppProvider provider) {
    if (provider.recentlyWatched.isEmpty) {
      return const Expanded(
        child: Center(
          child: Text(
            'No recently watched items.',
            style: TextStyle(color: Colors.grey, fontSize: 16),
          ),
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 2 / 3,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: provider.recentlyWatched.length,
      itemBuilder: (context, index) {
        final recent = provider.recentlyWatched[index];
        final imageUrl = recent.icon;
        final name = recent.name;

        double progress = 0;
        if (recent.position != null && recent.duration != null && recent.duration! > 0) {
          progress = (recent.position! / recent.duration!).clamp(0.0, 1.0);
        }

        return GestureDetector(
          onTap: () {
            if (recent.type == 'live') {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => LivePlayerScreen(
                    channelName: name,
                    streamId: int.tryParse(recent.id) ?? 0,
                    extension: recent.extension ?? 'm3u8',
                    type: 'live',
                  ),
                ),
              );
            } else {
               Navigator.push(
                 context,
                 MaterialPageRoute(
                   builder: (_) => MediaInfoScreen(
                     id: int.tryParse(recent.id) ?? 0,
                     type: recent.type,
                     title: name,
                     cover: imageUrl,
                     extension: recent.extension ?? 'mp4',
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
                        errorWidget: (context, url, error) => Icon(recent.type == 'live' ? Icons.tv : Icons.movie, color: Colors.grey, size: 32),
                      )
                    : Icon(recent.type == 'live' ? Icons.tv : Icons.movie, color: Colors.grey, size: 32),
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    color: Colors.black54,
                    padding: const EdgeInsets.all(4),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          name,
                          style: const TextStyle(color: Colors.white, fontSize: 12),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                        ),
                        if (progress > 0) ...[
                          const SizedBox(height: 4),
                          LinearProgressIndicator(
                            value: progress,
                            backgroundColor: Colors.white24,
                            color: Colors.blue,
                            minHeight: 2,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                Positioned(
                  top: 4,
                  right: 4,
                  child: Container(
                    decoration: const BoxDecoration(
                      color: Colors.black54,
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.close, color: Colors.white, size: 20),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () {
                        provider.removeRecentlyWatched(recent.id);
                      },
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
    if (activeTab == 'favorites') {
      return Expanded(child: _buildFavoritesGrid(provider));
    }
    if (activeTab == 'recents') {
      return Expanded(child: _buildRecentsGrid(provider));
    }

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
