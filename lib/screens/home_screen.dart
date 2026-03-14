import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/app_provider.dart';
import '../services/xtream_service.dart';
import '../services/xmltv_parser.dart';
import 'dart:async';
import 'package:linked_scroll_controller/linked_scroll_controller.dart';
import '../models/iptv.dart' as iptv;
import '../models/iptv.dart' hide Category;
import '../utils/epg.dart';
import '../l10n/app_localizations.dart';
import 'live_player_screen.dart';
import 'media_info_screen.dart';
import '../utils/platform.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String activeTab = 'live';
  String? selectedCategoryId;
  bool loading = false;
  int nowTime = DateTime.now().millisecondsSinceEpoch ~/ 1000;
  late int baseTime;
  Timer? _timer;
  late final LinkedScrollControllerGroup _linkedScrollControllerGroup;
  late final ScrollController _headerScrollController;

  @override
  void initState() {
    super.initState();

    final now = DateTime.now();
    baseTime = DateTime(now.year, now.month, now.day, now.hour).millisecondsSinceEpoch ~/ 1000;

    _linkedScrollControllerGroup = LinkedScrollControllerGroup();
    _headerScrollController = _linkedScrollControllerGroup.addAndGet();
    _timer = Timer.periodic(const Duration(minutes: 1), (timer) {
      if (mounted) {
        final currentNow = DateTime.now();
        final currentBaseTime = DateTime(currentNow.year, currentNow.month, currentNow.day, currentNow.hour).millisecondsSinceEpoch ~/ 1000;
        setState(() {
          nowTime = currentNow.millisecondsSinceEpoch ~/ 1000;
          baseTime = currentBaseTime;
        });
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAndLoadEpg();
      _loadData();
    });
  }

  Future<void> _checkAndLoadEpg() async {
    final appProvider = Provider.of<AppProvider>(context, listen: false);
    if (appProvider.config == null || appProvider.config!.type != 'xtream') return;

    // Load EPG if empty
    if (appProvider.epgData.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Loading EPG Data... Please wait.'),
          duration: Duration(seconds: 3),
        ),
      );

      try {
        final xtream = XtreamService(appProvider.config!);
        final epgUrl = xtream.getXmltvUrl();
        final parser = XMLTVParser(epgUrl);
        final groupedEpg = await parser.getGroupedEpg();

        if (groupedEpg.isNotEmpty) {
          await appProvider.setEpgData(groupedEpg);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('EPG Data loaded successfully.'),
                duration: Duration(seconds: 2),
              ),
            );
          }
        }
      } catch (e) {
        debugPrint('Error loading EPG on startup: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to load EPG Data.'),
              duration: Duration(seconds: 2),
            ),
          );
        }
      }
    }
  }

  @override
  void dispose() {
    _headerScrollController.dispose();
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

  Widget _buildCategories(AppProvider provider, {bool vertical = false}) {
    if (activeTab == 'favorites' || activeTab == 'recents') return const SizedBox.shrink();

    if (loading && provider.categories.isEmpty) {
      return SizedBox(height: vertical ? null : 52, child: const Center(child: CircularProgressIndicator()));
    }

    return Container(
      height: vertical ? double.infinity : 52,
      color: const Color(0xFF151515),
      child: ListView.builder(
        scrollDirection: vertical ? Axis.vertical : Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: provider.categories.length,
        itemBuilder: (context, index) {
          final cat = provider.categories[index];
          final isSelected = cat.category_id == selectedCategoryId;

          return GestureDetector(
            onTap: () => _loadChannels(cat.category_id),
            child: Container(
              margin: vertical ? const EdgeInsets.only(bottom: 8) : const EdgeInsets.only(right: 8),
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
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLiveList(AppProvider provider) {
    final bool isTvMode = isTV(context);
    final double channelColWidth = isTvMode ? 300 : MediaQuery.of(context).size.width * 0.35;

    return Column(
      children: [
        // EPG Timeline Header
        Row(
          children: [
            Container(
              width: channelColWidth,
              height: 40,
              color: const Color(0xFF151515),
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: const Text('Channels', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
            ),
            Expanded(
              child: Container(
                height: 40,
                color: const Color(0xFF151515),
                child: ListView.builder(
                  controller: _headerScrollController,
                  scrollDirection: Axis.horizontal,
                  physics: const ClampingScrollPhysics(),
                  itemCount: 24, // 24 hours from now
                  itemBuilder: (context, index) {
                    final time = DateTime.fromMillisecondsSinceEpoch((baseTime + index * 3600) * 1000);
                    return Container(
                      width: 200, // Fixed width per hour block
                      alignment: Alignment.centerLeft,
                      padding: const EdgeInsets.only(left: 8),
                      decoration: const BoxDecoration(
                        border: Border(left: BorderSide(color: Color(0xFF2C2C2E), width: 0.5)),
                      ),
                      child: Text(
                        "${time.hour.toString().padLeft(2, '0')}:00",
                        style: const TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async {
              if (selectedCategoryId != null) {
                await _loadChannels(selectedCategoryId!);
              }
            },
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: provider.channels.length,
              itemBuilder: (context, index) {
                final chan = provider.channels[index];
                final isFav = provider.isFavorite(chan.stream_id.toString());
                final epgKey = getEpgKey(chan);
                final programs = provider.epgData[epgKey] ?? [];
                final isLocked = provider.isChannelLocked(chan.stream_id.toString());
                return _LiveChannelRow(
                  chan: chan, provider: provider, isFav: isFav, isLocked: isLocked, programs: programs, channelColWidth: channelColWidth, nowTime: nowTime, baseTime: baseTime, promptPin: _promptPin, linkedScrollControllerGroup: _linkedScrollControllerGroup,
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Future<bool> _promptPin(AppProvider provider) async {
    if (provider.pin == null || provider.pin!.isEmpty) return true;

    return await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1C1C1E),
          title: const Text('Enter PIN', style: TextStyle(color: Colors.white)),
          content: TextField(
            autofocus: true,
            keyboardType: TextInputType.number,
            obscureText: true,
            maxLength: 4,
            style: const TextStyle(color: Colors.white, fontSize: 24, letterSpacing: 8),
            textAlign: TextAlign.center,
            decoration: const InputDecoration(
              counterText: '',
              enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.grey)),
              focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.blue)),
            ),
            onChanged: (value) {
              if (value.length == 4) {
                if (value == provider.pin) {
                  Navigator.pop(context, true);
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Incorrect PIN')),
                  );
                  Navigator.pop(context, false);
                }
              }
            },
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
          ],
        );
      },
    ) ?? false;
  }

  Widget _buildGrid(AppProvider provider) {
    final bool isTvMode = isTV(context);

    return RefreshIndicator(
      onRefresh: () async {
        if (selectedCategoryId != null) {
          await _loadChannels(selectedCategoryId!);
        }
      },
      child: GridView.builder(
        padding: const EdgeInsets.all(12),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: isTvMode ? 6 : 3,
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
          final isLocked = provider.isChannelLocked(id);

          return GestureDetector(
            onTap: () async {
               if (id.isNotEmpty) {
                 if (isLocked) {
                   final unlocked = await _promptPin(provider);
                   if (!unlocked) return;
                   if (!mounted) return;
                 }
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
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          decoration: const BoxDecoration(
                            color: Colors.black54,
                            shape: BoxShape.circle,
                          ),
                          child: IconButton(
                            icon: Icon(
                              isLocked ? Icons.lock : Icons.lock_open,
                              color: isLocked ? Colors.red : Colors.white,
                              size: 20,
                            ),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: () async {
                              if (isLocked) {
                                final unlocked = await _promptPin(provider);
                                if (unlocked) {
                                  provider.unlockChannel(id);
                                }
                              } else {
                                if (provider.pin == null || provider.pin!.isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Please set up a PIN in Settings first')),
                                  );
                                  return;
                                }
                                provider.lockChannel(id);
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 4),
                        Container(
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
                      ],
                    ),
                  ),
                  if (isLocked)
                    Container(
                      color: Colors.black54,
                      child: const Center(
                        child: Icon(Icons.lock, color: Colors.white, size: 48),
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
      return const Center(
        child: Text(
          'No favorites added yet.',
          style: TextStyle(color: Colors.grey, fontSize: 16),
        ),
      );
    }

    final bool isTvMode = isTV(context);

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isTvMode ? 6 : 3,
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
      return const Center(
        child: Text(
          'No recently watched items.',
          style: TextStyle(color: Colors.grey, fontSize: 16),
        ),
      );
    }

    final bool isTvMode = isTV(context);

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: isTvMode ? 6 : 3,
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
      return _buildFavoritesGrid(provider);
    }
    if (activeTab == 'recents') {
      return _buildRecentsGrid(provider);
    }

    if (loading && provider.channels.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (selectedCategoryId == null) {
      return const Center(
        child: Text(
          'Select a category to view items',
          style: TextStyle(color: Colors.grey, fontSize: 16),
        ),
      );
    }

    if (provider.channels.isEmpty) {
       return const Center(
        child: Text(
          'No items found in this category',
          style: TextStyle(color: Colors.grey, fontSize: 16),
        ),
      );
    }

    if (activeTab == 'live') {
      return _buildLiveList(provider);
    } else {
      return _buildGrid(provider);
    }
  }

  IconData _getIconData(String? iconName) {
    switch (iconName) {
      case 'tv': return Icons.tv;
      case 'movie': return Icons.movie;
      case 'star': return Icons.star;
      case 'public': return Icons.public;
      case 'dns': return Icons.dns;
      case 'live_tv': return Icons.live_tv;
      case 'sports_soccer': return Icons.sports_soccer;
      case 'music_note': return Icons.music_note;
      case 'child_care': return Icons.child_care;
      case 'business': return Icons.business;
      default: return Icons.dns;
    }
  }

  Widget _buildSidebar(double sidebarWidth) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      width: sidebarWidth,
      child: Consumer<AppProvider>(
        builder: (context, provider, child) {
          return Column(
            children: [
              Expanded(
                child: ListView(
                  children: [
                    ...['live', 'vod', 'series', 'favorites', 'recents', 'settings'].map((tab) {
                      final isSelected = activeTab == tab;
                      final localizations = AppLocalizations.of(context);
                      String label = tab == 'live' ? (localizations?.live ?? 'Live')
                                   : (tab == 'vod' ? (localizations?.vod ?? 'Movies')
                                   : (tab == 'series' ? (localizations?.series ?? 'Series')
                                   : (tab == 'recents' ? (localizations?.recents ?? 'Recents')
                                   : (tab == 'settings' ? (localizations?.settings ?? 'Settings')
                                   : (localizations?.favorites ?? 'Favorites')))));
                      IconData icon = tab == 'live' ? Icons.tv : (tab == 'vod' ? Icons.movie : (tab == 'series' ? Icons.list : (tab == 'recents' ? Icons.history : (tab == 'settings' ? Icons.settings : Icons.favorite))));

                      return ListTile(
                        selected: isSelected,
                        selectedTileColor: Colors.blue.withValues(alpha: 0.3),
                        leading: Icon(icon, color: isSelected ? Colors.white : Colors.grey),
                        title: sidebarWidth >= 120 ? Text(
                          label,
                          style: TextStyle(color: isSelected ? Colors.white : Colors.grey),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ) : null,
                        onTap: () {
                          if (tab == 'settings') {
                            Navigator.pushNamed(context, '/settings');
                            return;
                          }
                          setState(() => activeTab = tab);
                          _loadData();
                        },
                      );
                    }).toList(),
                    const Divider(color: Color(0xFF2C2C2E), height: 32),
                    if (sidebarWidth >= 120)
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Text('Providers', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ...provider.providers.map((p) {
                      final isCurrentProvider = provider.config?.id == p.id;
                      return ListTile(
                        selected: isCurrentProvider,
                        selectedTileColor: Colors.white.withValues(alpha: 0.1),
                        leading: Icon(_getIconData(p.icon), color: isCurrentProvider ? Colors.white : Colors.grey),
                        title: sidebarWidth >= 120 ? Text(
                          p.name,
                          style: TextStyle(color: isCurrentProvider ? Colors.white : Colors.grey),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ) : null,
                        onTap: () async {
                          if (!isCurrentProvider) {
                            await provider.setConfig(p);
                            if (mounted) {
                              setState(() {
                                // Default to live when switching provider to reset view nicely
                                activeTab = 'live';
                              });
                              _loadData();
                              _checkAndLoadEpg();
                            }
                          }
                        },
                      );
                    }).toList(),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool isTvMode = isTV(context);
    final bool isCategorySelected = selectedCategoryId != null;

    // Determine Sidebar Width dynamically to collapse when navigating deeper
    final double expandedSidebarWidth = isTvMode ? 150 : MediaQuery.of(context).size.width * 0.15;
    final double collapsedSidebarWidth = isTvMode ? 90 : 85;
    final double sidebarWidth = isCategorySelected ? collapsedSidebarWidth : expandedSidebarWidth;

    // Determine Category Column Width dynamically to collapse when navigating deeper
    final double expandedCategoryWidth = isTvMode ? 250 : MediaQuery.of(context).size.width * 0.25;
    final double collapsedCategoryWidth = isTvMode ? 180 : MediaQuery.of(context).size.width * 0.18;
    final double categoryWidth = isCategorySelected ? collapsedCategoryWidth : expandedCategoryWidth;

    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      body: SafeArea(
        child: Row(
          children: [
            _buildSidebar(sidebarWidth),
            Container(width: 1, color: const Color(0xFF2C2C2E)),
            if (activeTab == 'live') ...[
              AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
                width: categoryWidth,
                child: Consumer<AppProvider>(
                  builder: (context, provider, child) {
                    return _buildCategories(provider, vertical: true);
                  },
                ),
              ),
              Container(width: 1, color: const Color(0xFF2C2C2E)),
            ],
            Expanded(
              child: Column(
                children: [
                  if (activeTab != 'live')
                    Consumer<AppProvider>(
                      builder: (context, provider, child) {
                        return _buildCategories(provider, vertical: false);
                      },
                    ),
                  Expanded(
                    child: Consumer<AppProvider>(
                      builder: (context, provider, child) {
                        return _buildContent(provider);
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LiveChannelRow extends StatefulWidget {
  final LiveChannel chan;
  final AppProvider provider;
  final bool isFav;
  final bool isLocked;
  final List<ParsedProgram> programs;
  final double channelColWidth;
  final int nowTime;
  final int baseTime;
  final Future<bool> Function(AppProvider provider) promptPin;
  final LinkedScrollControllerGroup linkedScrollControllerGroup;

  const _LiveChannelRow({
    Key? key,
    required this.chan,
    required this.provider,
    required this.isFav,
    required this.isLocked,
    required this.programs,
    required this.channelColWidth,
    required this.nowTime,
    required this.baseTime,
    required this.promptPin,
    required this.linkedScrollControllerGroup,
  }) : super(key: key);

  @override
  State<_LiveChannelRow> createState() => _LiveChannelRowState();
}

class _LiveChannelRowState extends State<_LiveChannelRow> {
  late ScrollController _rowScrollController;

  @override
  void initState() {
    super.initState();
    _rowScrollController = widget.linkedScrollControllerGroup.addAndGet();
  }

  @override
  void dispose() {
    _rowScrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 80,
      child: Row(
        children: [
          // Channel info (Fixed left column)
          GestureDetector(
            onTap: () async {
              if (widget.chan.stream_id != null) {
                if (widget.isLocked) {
                  final unlocked = await widget.promptPin(widget.provider);
                  if (!unlocked) return;
                  if (!mounted) return;
                }
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => LivePlayerScreen(
                      channelName: widget.chan.name,
                      streamId: widget.chan.stream_id!,
                      extension: 'm3u8',
                      type: 'live',
                    ),
                  ),
                );
              }
            },
            child: Container(
              width: widget.channelColWidth,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: const BoxDecoration(
                color: Color(0xFF0F0F0F), // Background to avoid transparent overlaps
                border: Border(
                  bottom: BorderSide(color: Color(0xFF2C2C2E), width: 1),
                  right: BorderSide(color: Color(0xFF2C2C2E), width: 1),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: const Color(0xFF2C2C2E),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        widget.chan.stream_icon != null && widget.chan.stream_icon!.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: widget.chan.stream_icon!,
                                fit: BoxFit.cover,
                                errorWidget: (context, url, error) => const Icon(Icons.tv, color: Colors.grey),
                              )
                            : const Icon(Icons.tv, color: Colors.grey),
                        if (widget.isLocked)
                          Container(
                            color: Colors.black54,
                            child: const Icon(Icons.lock, color: Colors.white, size: 24),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      widget.chan.name,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (widget.channelColWidth >= 200) ...[
                    IconButton(
                      icon: Icon(
                        widget.isFav ? Icons.favorite : Icons.favorite_border,
                        color: widget.isFav ? Colors.red : Colors.grey,
                        size: 20,
                      ),
                      onPressed: () {
                        if (widget.isFav) {
                          widget.provider.removeFavorite(widget.chan.stream_id.toString());
                        } else {
                          widget.provider.addFavorite(iptv.FavoriteItem(
                            id: widget.chan.stream_id.toString(),
                            type: 'live',
                            name: widget.chan.name,
                            icon: widget.chan.stream_icon,
                            categoryId: widget.chan.category_id,
                            addedAt: DateTime.now().millisecondsSinceEpoch,
                          ));
                        }
                      },
                    ),
                    IconButton(
                      icon: Icon(
                        widget.isLocked ? Icons.lock : Icons.lock_open,
                        color: widget.isLocked ? Colors.red : Colors.grey,
                        size: 20,
                      ),
                      onPressed: () async {
                        if (widget.isLocked) {
                          final unlocked = await widget.promptPin(widget.provider);
                          if (unlocked) {
                            widget.provider.unlockChannel(widget.chan.stream_id.toString());
                          }
                        } else {
                          if (widget.provider.pin == null || widget.provider.pin!.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Please set up a PIN in Settings first')),
                            );
                            return;
                          }
                          widget.provider.lockChannel(widget.chan.stream_id.toString());
                        }
                      },
                    ),
                  ],
                ],
              ),
            ),
          ),

          // EPG Timeline Row (Right side scrolling content)
          Expanded(
            child: Container(
              height: 80,
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: Color(0xFF2C2C2E), width: 1)),
              ),
              child: SingleChildScrollView(
                controller: _rowScrollController,
                scrollDirection: Axis.horizontal,
                physics: const ClampingScrollPhysics(),
                child: SizedBox(
                  width: 24 * 200.0, // Match the total length of timeline header
                  child: widget.programs.isEmpty
                      ? Container(
                          alignment: Alignment.centerLeft,
                          padding: const EdgeInsets.only(left: 16),
                          child: const Text("No EPG Data", style: TextStyle(color: Colors.grey)),
                        )
                      : Stack(
                          children: widget.programs.map((prog) {
                            final double timelineEndTime = widget.baseTime + (24 * 3600.0);

                            // Skip programs completely outside the 24-hour timeline window
                            if (prog.end <= widget.baseTime || prog.start >= timelineEndTime) {
                              return const SizedBox.shrink();
                            }

                            // Calculate start and end offsets clamped to the 24-hour window
                            final startSecondsOffset = (prog.start < widget.baseTime ? widget.baseTime : prog.start) - widget.baseTime;
                            final endSecondsOffset = (prog.end > timelineEndTime ? timelineEndTime : prog.end) - widget.baseTime;

                            final left = (startSecondsOffset / 3600.0) * 200.0;
                            final width = ((endSecondsOffset - startSecondsOffset) / 3600.0) * 200.0;

                            // Don't draw if width is negligible
                            if (width <= 0) return const SizedBox.shrink();

                            final isCurrent = widget.nowTime >= prog.start && widget.nowTime < prog.end;

                            return Positioned(
                              left: left,
                              width: width - 2, // 2px margin between blocks
                              top: 8,
                              bottom: 8,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: isCurrent ? Colors.blue.withValues(alpha: 0.3) : const Color(0xFF2C2C2E),
                                  borderRadius: BorderRadius.circular(4),
                                  border: isCurrent ? Border.all(color: Colors.blue, width: 1) : null,
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      prog.title_raw,
                                      style: TextStyle(
                                        color: isCurrent ? Colors.white : Colors.grey[300],
                                        fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                                        fontSize: 12,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      "${DateTime.fromMillisecondsSinceEpoch(prog.start * 1000).hour.toString().padLeft(2, '0')}:${DateTime.fromMillisecondsSinceEpoch(prog.start * 1000).minute.toString().padLeft(2, '0')} - ${DateTime.fromMillisecondsSinceEpoch(prog.end * 1000).hour.toString().padLeft(2, '0')}:${DateTime.fromMillisecondsSinceEpoch(prog.end * 1000).minute.toString().padLeft(2, '0')}",
                                      style: const TextStyle(color: Colors.grey, fontSize: 10),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
