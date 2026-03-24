package api

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import models.Category
import models.Channel
import models.Movie
import models.Series
import models.IPTVProfile
import utils.Logger

class XtreamClient(private val client: HttpClient = createHttpClient()) {

    suspend fun authenticate(profile: IPTVProfile.XtreamProfile): Boolean {
        return try {
            val response: Map<String, Any> = client.get("${profile.url}/player_api.php") {
                parameter("username", profile.username)
                parameter("password", profile.password)
            }.body()

            // Checking if user info is present in the response
            response.containsKey("user_info")
        } catch (e: Exception) {
            Logger.error("Failed to authenticate Xtream profile ${profile.name}", e)
            false
        }
    }

    suspend fun getLiveCategories(profile: IPTVProfile.XtreamProfile): List<Category> {
        return try {
            client.get("${profile.url}/player_api.php") {
                parameter("username", profile.username)
                parameter("password", profile.password)
                parameter("action", "get_live_categories")
            }.body()
        } catch (e: Exception) {
            Logger.error("Failed to fetch live categories", e)
            emptyList()
        }
    }

    suspend fun getLiveStreams(profile: IPTVProfile.XtreamProfile, categoryId: String? = null): List<Channel> {
        return try {
            val streams: List<XtreamStreamResponse> = client.get("${profile.url}/player_api.php") {
                parameter("username", profile.username)
                parameter("password", profile.password)
                parameter("action", "get_live_streams")
                if (categoryId != null) {
                    parameter("category_id", categoryId)
                }
            }.body()

            streams.map {
                Channel(
                    id = it.stream_id.toString(),
                    name = it.name ?: "Unknown Channel",
                    url = "${profile.url}/live/${profile.username}/${profile.password}/${it.stream_id}.ts", // Defaulting to .ts, actual app handles this more flexibly
                    logo = it.stream_icon,
                    group = it.category_id ?: "Uncategorized", // group maps to category_id conceptually here
                    epgChannelId = it.epg_channel_id,
                    streamId = it.stream_id,
                    categoryId = it.category_id,
                    tvArchive = it.tv_archive,
                    tvArchiveDuration = it.tv_archive_duration
                )
            }
        } catch (e: Exception) {
            Logger.error("Failed to fetch live streams", e)
            emptyList()
        }
    }

    suspend fun getVodCategories(profile: IPTVProfile.XtreamProfile): List<Category> {
        return try {
            client.get("${profile.url}/player_api.php") {
                parameter("username", profile.username)
                parameter("password", profile.password)
                parameter("action", "get_vod_categories")
            }.body()
        } catch (e: Exception) {
            Logger.error("Failed to fetch VOD categories", e)
            emptyList()
        }
    }

    suspend fun getVodStreams(profile: IPTVProfile.XtreamProfile, categoryId: String? = null): List<Movie> {
        return try {
            val streams: List<XtreamStreamResponse> = client.get("${profile.url}/player_api.php") {
                parameter("username", profile.username)
                parameter("password", profile.password)
                parameter("action", "get_vod_streams")
                if (categoryId != null) {
                    parameter("category_id", categoryId)
                }
            }.body()

            streams.map {
                Movie(
                    id = it.stream_id.toString(),
                    name = it.name ?: "Unknown Movie",
                    streamUrl = "${profile.url}/movie/${profile.username}/${profile.password}/${it.stream_id}.${it.container_extension ?: "mp4"}",
                    cover = it.stream_icon,
                    group = it.category_id ?: "Uncategorized",
                    categoryId = it.category_id,
                    containerExtension = it.container_extension
                )
            }
        } catch (e: Exception) {
            Logger.error("Failed to fetch VOD streams", e)
            emptyList()
        }
    }

    suspend fun getSeriesCategories(profile: IPTVProfile.XtreamProfile): List<Category> {
        return try {
            client.get("${profile.url}/player_api.php") {
                parameter("username", profile.username)
                parameter("password", profile.password)
                parameter("action", "get_series_categories")
            }.body()
        } catch (e: Exception) {
            Logger.error("Failed to fetch Series categories", e)
            emptyList()
        }
    }

    suspend fun getSeries(profile: IPTVProfile.XtreamProfile, categoryId: String? = null): List<Series> {
        return try {
             val streams: List<XtreamStreamResponse> = client.get("${profile.url}/player_api.php") {
                parameter("username", profile.username)
                parameter("password", profile.password)
                parameter("action", "get_series")
                if (categoryId != null) {
                    parameter("category_id", categoryId)
                }
            }.body()

            streams.map {
                Series(
                    id = it.series_id.toString(),
                    name = it.name ?: "Unknown Series",
                    cover = it.cover ?: it.stream_icon,
                    group = it.category_id ?: "Uncategorized",
                    categoryId = it.category_id,
                    seasons = emptyList() // Fetching detailed info would populate this
                )
            }
        } catch (e: Exception) {
            Logger.error("Failed to fetch Series", e)
            emptyList()
        }
    }
}
