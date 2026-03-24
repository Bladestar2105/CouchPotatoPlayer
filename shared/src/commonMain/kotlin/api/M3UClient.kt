package api

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import models.Channel
import models.IPTVProfile
import utils.Logger

class M3UClient(private val client: HttpClient = createHttpClient()) {

    suspend fun fetchPlaylist(profile: IPTVProfile.M3UProfile): List<Channel> {
        return try {
            val response: String = client.get(profile.url).bodyAsText()
            parseM3U(response)
        } catch (e: Exception) {
            Logger.error("Failed to fetch M3U playlist from ${profile.url}", e)
            emptyList()
        }
    }

    private fun parseM3U(content: String): List<Channel> {
        val channels = mutableListOf<Channel>()
        val lines = content.lines()

        var currentName = ""
        var currentLogo: String? = null
        var currentGroup = "Uncategorized"
        var currentTvgId: String? = null

        for (line in lines) {
            val trimmedLine = line.trim()
            if (trimmedLine.startsWith("#EXTINF:")) {
                // Parse attributes
                val tvgIdMatch = Regex("tvg-id=\"([^\"]*)\"").find(trimmedLine)
                val tvgLogoMatch = Regex("tvg-logo=\"([^\"]*)\"").find(trimmedLine)
                val groupTitleMatch = Regex("group-title=\"([^\"]*)\"").find(trimmedLine)

                currentTvgId = tvgIdMatch?.groupValues?.get(1)
                currentLogo = tvgLogoMatch?.groupValues?.get(1)
                currentGroup = groupTitleMatch?.groupValues?.get(1) ?: "Uncategorized"

                // Parse name
                val nameMatch = Regex(",(.*)$").find(trimmedLine)
                currentName = nameMatch?.groupValues?.get(1)?.trim() ?: "Unknown Channel"
            } else if (trimmedLine.isNotEmpty() && !trimmedLine.startsWith("#")) {
                // It's a URL line
                val url = trimmedLine
                channels.add(
                    Channel(
                        id = (currentTvgId ?: currentName) + url, // Simple composite ID
                        name = currentName,
                        url = url,
                        logo = currentLogo,
                        group = currentGroup,
                        tvgId = currentTvgId
                    )
                )
                // Reset for next
                currentName = ""
                currentLogo = null
                currentGroup = "Uncategorized"
                currentTvgId = null
            }
        }
        return channels
    }
}