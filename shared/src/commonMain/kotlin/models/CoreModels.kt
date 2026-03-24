package models

import kotlinx.serialization.Serializable

@Serializable
data class Channel(
    val id: String,
    val name: String,
    val url: String,
    val logo: String? = null,
    val group: String,
    val tvgId: String? = null,
    val isAdult: Boolean? = false,
    val epgChannelId: String? = null,
    val streamId: Int? = null,
    val categoryId: String? = null,
    val containerExtension: String? = null,
    val tvArchive: Int? = null,
    val tvArchiveDuration: Int? = null,
    val catchupId: String? = null,
    val catchupDays: Int? = null
)

@Serializable
data class Movie(
    val id: String,
    val name: String,
    val streamUrl: String,
    val cover: String? = null,
    val group: String,
    val isAdult: Boolean? = false,
    val categoryId: String? = null,
    val containerExtension: String? = null
)

@Serializable
data class Episode(
    val id: String,
    val name: String,
    val streamUrl: String,
    val episodeNumber: Int,
    val containerExtension: String? = null
)

@Serializable
data class Season(
    val id: String,
    val name: String,
    val seasonNumber: Int,
    val episodes: List<Episode>
)

@Serializable
data class Series(
    val id: String,
    val name: String,
    val cover: String? = null,
    val group: String,
    val seasons: List<Season>,
    val isAdult: Boolean? = false,
    val categoryId: String? = null
)

@Serializable
data class EPGProgram(
    val id: String,
    val channelId: String,
    val title: String,
    val description: String,
    val startUnix: Long,
    val endUnix: Long,
    val titleRaw: String? = null,
    val descriptionRaw: String? = null
)

@Serializable
data class FavoriteItem(
    val id: String,
    val type: String, // 'live' | 'vod' | 'series'
    val name: String,
    val icon: String? = null,
    val categoryId: String? = null,
    val addedAt: Long,
    val lastWatchedAt: Long? = null
)

@Serializable
data class RecentlyWatchedItem(
    val id: String,
    val type: String, // 'live' | 'vod' | 'series'
    val name: String,
    val icon: String? = null,
    val extension: String? = null,
    val directSource: String? = null,
    val lastWatchedAt: Long,
    val position: Long? = null,
    val duration: Long? = null,
    val episodeId: Int? = null,
    val episodeName: String? = null,
    val seasonNumber: Int? = null,
    val episodeNumber: Int? = null
)

@Serializable
data class Category(
    val categoryId: String,
    val categoryName: String,
    val parentId: Int? = null,
    val adult: Int? = null
)

@Serializable
sealed class IPTVProfile {
    abstract val id: String
    abstract val name: String
    abstract val icon: String?

    @Serializable
    data class M3UProfile(
        override val id: String,
        override val name: String,
        override val icon: String? = null,
        val url: String,
        val epgUrl: String? = null
    ) : IPTVProfile()

    @Serializable
    data class XtreamProfile(
        override val id: String,
        override val name: String,
        override val icon: String? = null,
        val url: String,
        val username: String,
        val password: String? = null
    ) : IPTVProfile()

    @Serializable
    data class StalkerProfile(
        override val id: String,
        override val name: String,
        override val icon: String? = null,
        val portalUrl: String,
        val macAddress: String
    ) : IPTVProfile()
}