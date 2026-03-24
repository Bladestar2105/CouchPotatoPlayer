package api

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import models.Category
import models.Channel
import models.IPTVProfile
import utils.Logger

class StalkerClient(private val client: HttpClient = createHttpClient()) {

    // Simulating Stalker portal JSON-RPC API responses
    suspend fun authenticate(profile: IPTVProfile.StalkerProfile): Boolean {
         return try {
            val response: Map<String, Any> = client.get("${profile.portalUrl}/c/") {
                parameter("type", "stb")
                parameter("action", "handshake")
                parameter("mac", profile.macAddress)
            }.body()

            response.containsKey("js_session_id") // Typically check session id
        } catch (e: Exception) {
            Logger.error("Failed to authenticate Stalker profile ${profile.name}", e)
            false
        }
    }

    suspend fun getLiveCategories(profile: IPTVProfile.StalkerProfile): List<Category> {
        return try {
            val response: Map<String, List<Map<String, Any>>> = client.get("${profile.portalUrl}/c/") {
                parameter("type", "itv")
                parameter("action", "get_genres")
                parameter("mac", profile.macAddress)
            }.body()

            response["js"]?.map {
                Category(
                    categoryId = it["id"]?.toString() ?: "",
                    categoryName = it["title"]?.toString() ?: "Unknown"
                )
            } ?: emptyList()
        } catch (e: Exception) {
            Logger.error("Failed to fetch Stalker live categories", e)
            emptyList()
        }
    }

    suspend fun getLiveStreams(profile: IPTVProfile.StalkerProfile, categoryId: String? = null): List<Channel> {
         return try {
            val response: Map<String, List<Map<String, Any>>> = client.get("${profile.portalUrl}/c/") {
                parameter("type", "itv")
                parameter("action", "get_all_channels")
                if (categoryId != null) parameter("genre", categoryId)
                parameter("mac", profile.macAddress)
            }.body()

             response["js"]?.map {
                Channel(
                    id = it["id"]?.toString() ?: "",
                    name = it["name"]?.toString() ?: "Unknown Channel",
                    url = it["cmd"]?.toString() ?: "", // The command or URL to play
                    logo = it["logo"]?.toString(),
                    group = it["tv_genre_id"]?.toString() ?: "Uncategorized"
                )
            } ?: emptyList()
        } catch (e: Exception) {
            Logger.error("Failed to fetch Stalker live streams", e)
            emptyList()
        }
    }
}