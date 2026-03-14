import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/app_provider.dart';
import '../models/iptv.dart';
import 'live_player_screen.dart';
import 'media_info_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({Key? key}) : super(key: key);

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  List<LiveChannel> _searchResults = [];
  bool _isSearching = false;

  void _performSearch(String query) {
    if (query.isEmpty) {
      setState(() {
        _searchQuery = query;
        _searchResults = [];
        _isSearching = false;
      });
      return;
    }

    setState(() {
      _searchQuery = query;
      _isSearching = true;
    });

    final provider = Provider.of<AppProvider>(context, listen: false);
    final results = provider.channels.where((c) {
      final name = c.name.toLowerCase();
      final title = c.title?.toLowerCase() ?? '';
      final q = query.toLowerCase();
      return name.contains(q) || title.contains(q);
    }).toList();

    setState(() {
      _searchResults = results;
      _isSearching = false;
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1C1C1E),
        iconTheme: const IconThemeData(color: Colors.white),
        title: TextField(
          controller: _searchController,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            hintText: 'Search...',
            hintStyle: TextStyle(color: Colors.grey),
            border: InputBorder.none,
          ),
          onChanged: _performSearch,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.clear, color: Colors.grey),
            onPressed: () {
              _searchController.clear();
              _performSearch('');
            },
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_searchQuery.isEmpty) {
      return const Center(
        child: Text(
          'Type to search in current tab',
          style: TextStyle(color: Colors.grey, fontSize: 16),
        ),
      );
    }

    if (_isSearching) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_searchResults.isEmpty) {
      return const Center(
        child: Text(
          'No results found',
          style: TextStyle(color: Colors.grey, fontSize: 16),
        ),
      );
    }

    return ListView.builder(
      itemCount: _searchResults.length,
      itemBuilder: (context, index) {
        final chan = _searchResults[index];
        final isLive = chan.stream_type != null && chan.stream_type != 'movie' && chan.stream_type != 'series';

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
            chan.name.isNotEmpty ? chan.name : chan.title ?? 'Unknown',
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          subtitle: Text(
            isLive ? 'Live TV' : (chan.series_id != null ? 'Series' : 'Movie'),
            style: const TextStyle(color: Colors.grey, fontSize: 12),
          ),
          onTap: () {
            if (isLive) {
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
            } else {
              final id = chan.series_id ?? chan.stream_id;
              if (id != null) {
                 Navigator.push(
                   context,
                   MaterialPageRoute(
                     builder: (_) => MediaInfoScreen(
                       id: id,
                       type: chan.series_id != null ? 'series' : 'vod',
                       title: chan.name.isNotEmpty ? chan.name : chan.title ?? 'Unknown',
                       cover: chan.stream_icon ?? chan.cover,
                       extension: chan.container_extension ?? 'mp4',
                     ),
                   ),
                 );
              }
            }
          },
        );
      },
    );
  }
}
