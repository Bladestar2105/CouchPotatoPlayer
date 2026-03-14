class PlayerConfig {
  final String id;
  final String name;
  final String type; // 'xtream' | 'm3u'
  final String serverUrl;
  final String username;
  final String password;
  final String? epgUrl;

  PlayerConfig({
    required this.id,
    required this.name,
    required this.type,
    required this.serverUrl,
    required this.username,
    this.password = '',
    this.epgUrl,
  });

  factory PlayerConfig.fromJson(Map<String, dynamic> json) {
    return PlayerConfig(
      id: json['id'],
      name: json['name'],
      type: json['type'],
      serverUrl: json['serverUrl'],
      username: json['username'] ?? '',
      password: json['password'] ?? '',
      epgUrl: json['epgUrl'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'serverUrl': serverUrl,
      'username': username,
      'password': password,
      'epgUrl': epgUrl,
    };
  }
}

class Category {
  final String category_id;
  final String category_name;
  final int? parent_id;
  final int? adult;

  Category({
    required this.category_id,
    required this.category_name,
    this.parent_id,
    this.adult,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      category_id: json['category_id'].toString(),
      category_name: json['category_name'].toString(),
      parent_id: json['parent_id'] != null ? int.tryParse(json['parent_id'].toString()) : null,
      adult: (json['is_adult'] != null ? int.tryParse(json['is_adult'].toString()) : null) ??
             (json['adult'] != null ? int.tryParse(json['adult'].toString()) : null),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'category_id': category_id,
      'category_name': category_name,
      'parent_id': parent_id,
      'adult': adult,
    };
  }
}

class LiveChannel {
  final int? num;
  final String name;
  final String? title;
  final String? stream_type;
  final int? stream_id;
  final String? stream_icon;
  final String? cover;
  final String? epg_channel_id;
  final String? added;
  final String category_id;
  final int? custom_sid;
  final int? tv_archive;
  final String? direct_source;
  final int? tv_archive_duration;
  final double? rating;
  final String? container_extension;
  final int? series_id;
  final String? backdrop_path;
  final String? plot;
  final String? cast;
  final String? director;
  final String? genre;
  final String? releaseDate;

  LiveChannel({
    this.num,
    required this.name,
    this.title,
    this.stream_type,
    this.stream_id,
    this.stream_icon,
    this.cover,
    this.epg_channel_id,
    this.added,
    required this.category_id,
    this.custom_sid,
    this.tv_archive,
    this.direct_source,
    this.tv_archive_duration,
    this.rating,
    this.container_extension,
    this.series_id,
    this.backdrop_path,
    this.plot,
    this.cast,
    this.director,
    this.genre,
    this.releaseDate,
  });

  factory LiveChannel.fromJson(Map<String, dynamic> json) {
    return LiveChannel(
      num: json['num'] != null ? int.tryParse(json['num'].toString()) : null,
      name: json['name'] ?? '',
      title: json['title'],
      stream_type: json['stream_type'],
      stream_id: json['stream_id'] != null ? int.tryParse(json['stream_id'].toString()) : null,
      stream_icon: json['stream_icon'],
      cover: json['cover'],
      epg_channel_id: json['epg_channel_id']?.toString(),
      added: json['added'],
      category_id: json['category_id'].toString(),
      custom_sid: json['custom_sid'] != null ? int.tryParse(json['custom_sid'].toString()) : null,
      tv_archive: json['tv_archive'] != null ? int.tryParse(json['tv_archive'].toString()) : null,
      direct_source: json['direct_source'],
      tv_archive_duration: json['tv_archive_duration'] != null ? int.tryParse(json['tv_archive_duration'].toString()) : null,
      rating: json['rating'] != null ? double.tryParse(json['rating'].toString()) : null,
      container_extension: json['container_extension'],
      series_id: json['series_id'] != null ? int.tryParse(json['series_id'].toString()) : null,
      backdrop_path: json['backdrop_path'],
      plot: json['plot'],
      cast: json['cast'],
      director: json['director'],
      genre: json['genre'],
      releaseDate: json['releaseDate'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'num': num,
      'name': name,
      'title': title,
      'stream_type': stream_type,
      'stream_id': stream_id,
      'stream_icon': stream_icon,
      'cover': cover,
      'epg_channel_id': epg_channel_id,
      'added': added,
      'category_id': category_id,
      'custom_sid': custom_sid,
      'tv_archive': tv_archive,
      'direct_source': direct_source,
      'tv_archive_duration': tv_archive_duration,
      'rating': rating,
      'container_extension': container_extension,
      'series_id': series_id,
      'backdrop_path': backdrop_path,
      'plot': plot,
      'cast': cast,
      'director': director,
      'genre': genre,
      'releaseDate': releaseDate,
    };
  }
}

class ParsedProgram {
  final int start;
  final int end;
  final String title_raw;
  final String description_raw;
  final String? start_formatted;
  final String? end_formatted;

  ParsedProgram({
    required this.start,
    required this.end,
    required this.title_raw,
    required this.description_raw,
    this.start_formatted,
    this.end_formatted,
  });

  factory ParsedProgram.fromJson(Map<String, dynamic> json) {
    return ParsedProgram(
      start: json['start'] is String ? int.tryParse(json['start']) ?? 0 : (json['start'] ?? 0),
      end: json['end'] is String ? int.tryParse(json['end']) ?? 0 : (json['end'] ?? 0),
      title_raw: json['title_raw'],
      description_raw: json['description_raw'] ?? '',
      start_formatted: json['start_formatted'],
      end_formatted: json['end_formatted'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'start': start,
      'end': end,
      'title_raw': title_raw,
      'description_raw': description_raw,
      'start_formatted': start_formatted,
      'end_formatted': end_formatted,
    };
  }
}

class FavoriteItem {
  final String id; // string representation of stream_id or series_id
  final String type; // 'live', 'vod', 'series'
  final String name;
  final String? icon;
  final String? categoryId;
  final int addedAt;

  FavoriteItem({
    required this.id,
    required this.type,
    required this.name,
    this.icon,
    this.categoryId,
    required this.addedAt,
  });

  factory FavoriteItem.fromJson(Map<String, dynamic> json) {
    return FavoriteItem(
      id: json['id'].toString(),
      type: json['type'],
      name: json['name'],
      icon: json['icon'],
      categoryId: json['categoryId']?.toString(),
      addedAt: json['addedAt'] ?? DateTime.now().millisecondsSinceEpoch,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'name': name,
      'icon': icon,
      'categoryId': categoryId,
      'addedAt': addedAt,
    };
  }
}

class RecentlyWatchedItem {
  final String id;
  final String type; // 'live', 'vod', 'series'
  final String name;
  final String? icon;
  final String? extension;
  final String? directSource;
  final int lastWatchedAt;
  final int? position;
  final int? duration;
  final int? episodeId;
  final String? episodeName;
  final int? seasonNumber;
  final int? episodeNumber;

  RecentlyWatchedItem({
    required this.id,
    required this.type,
    required this.name,
    this.icon,
    this.extension,
    this.directSource,
    required this.lastWatchedAt,
    this.position,
    this.duration,
    this.episodeId,
    this.episodeName,
    this.seasonNumber,
    this.episodeNumber,
  });

  factory RecentlyWatchedItem.fromJson(Map<String, dynamic> json) {
    return RecentlyWatchedItem(
      id: json['id'].toString(),
      type: json['type'],
      name: json['name'],
      icon: json['icon'],
      extension: json['extension'],
      directSource: json['directSource'],
      lastWatchedAt: json['lastWatchedAt'] ?? DateTime.now().millisecondsSinceEpoch,
      position: json['position'],
      duration: json['duration'],
      episodeId: json['episodeId'],
      episodeName: json['episodeName'],
      seasonNumber: json['seasonNumber'],
      episodeNumber: json['episodeNumber'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'name': name,
      'icon': icon,
      'extension': extension,
      'directSource': directSource,
      'lastWatchedAt': lastWatchedAt,
      'position': position,
      'duration': duration,
      'episodeId': episodeId,
      'episodeName': episodeName,
      'seasonNumber': seasonNumber,
      'episodeNumber': episodeNumber,
    };
  }
}
