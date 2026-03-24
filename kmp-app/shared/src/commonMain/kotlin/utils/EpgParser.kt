package utils

import models.EPGProgram
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlinx.serialization.Serializable
import nl.adaptivity.xmlutil.serialization.XML
import nl.adaptivity.xmlutil.serialization.XmlElement
import nl.adaptivity.xmlutil.serialization.XmlSerialName
import nl.adaptivity.xmlutil.serialization.XmlValue

@Serializable
@XmlSerialName("tv", namespace = "", prefix = "")
data class Tv(
    val programmes: List<Programme> = emptyList()
)

@Serializable
@XmlSerialName("programme", namespace = "", prefix = "")
data class Programme(
    val start: String,
    val stop: String,
    val channel: String,
    val title: Title,
    val desc: Desc? = null
)

@Serializable
@XmlSerialName("title", namespace = "", prefix = "")
data class Title(
    @XmlValue val value: String = ""
)

@Serializable
@XmlSerialName("desc", namespace = "", prefix = "")
data class Desc(
    @XmlValue val value: String = ""
)

/**
 * Kotlin Multiplatform migration for `epgParser.ts`.
 * Since `fast-xml-parser` is JS-only, this provides the interface and date parsing logic.
 * Actual XML parsing in KMP requires `xmlutil` or native platform implementations.
 */
object EpgParser {

    private val xml = XML {
        autoPolymorphic = true
        unknownChildHandler = { _, _, _, _, _ -> emptyList() } // Ignore unknown XML tags
    }

    /**
     * Parses the XMLTV date string into a Kotlinx DateTime Unix Timestamp (Long).
     * Replaces the TypeScript `parseXMLDate`.
     *
     * E.g., format "20240118050000 +0000"
     */
    fun parseXMLDate(dateString: String): Long? {
        if (dateString.length < 14) return null

        return try {
            val year = dateString.substring(0, 4).toInt()
            val month = dateString.substring(4, 6).toInt()
            val day = dateString.substring(6, 8).toInt()
            val hour = dateString.substring(8, 10).toInt()
            val minute = dateString.substring(10, 12).toInt()
            val second = dateString.substring(12, 14).toInt()

            // Basic validation
            if (month !in 1..12 || day !in 1..31 || hour !in 0..23 || minute !in 0..59 || second !in 0..59) {
                return null
            }

            // Create an ISO-8601 string to parse into Instant
            val isoString = buildString {
                append(year)
                append("-")
                append(month.toString().padStart(2, '0'))
                append("-")
                append(day.toString().padStart(2, '0'))
                append("T")
                append(hour.toString().padStart(2, '0'))
                append(":")
                append(minute.toString().padStart(2, '0'))
                append(":")
                append(second.toString().padStart(2, '0'))
                append("Z")
            }

            var instant = Instant.parse(isoString)

            // Handle timezone offset if present
            if (dateString.length >= 19) {
                val offsetSign = dateString.substring(15, 16)
                val offsetHour = dateString.substring(16, 18).toLong()
                val offsetMin = dateString.substring(18, 20).toLong()

                val offsetTotalMs = ((offsetHour * 60) + offsetMin) * 60000

                instant = if (offsetSign == "+") {
                    Instant.fromEpochMilliseconds(instant.toEpochMilliseconds() - offsetTotalMs)
                } else if (offsetSign == "-") {
                    Instant.fromEpochMilliseconds(instant.toEpochMilliseconds() + offsetTotalMs)
                } else {
                    instant
                }
            }

            instant.toEpochMilliseconds()
        } catch (e: Exception) {
            Logger.error("Failed to parse XML Date: $dateString", e)
            null
        }
    }

    /**
     * Parse XMLTV string using xmlutil and map to EPGProgram models.
     */
    fun parseXMLTVFromString(xmlData: String): Map<String, List<EPGProgram>> {
        Logger.log("Parsing XMLTV data")
        val epgData = mutableMapOf<String, MutableList<EPGProgram>>()

        try {
            val tv = xml.decodeFromString(Tv.serializer(), xmlData)

            for (prog in tv.programmes) {
                val startUnix = parseXMLDate(prog.start) ?: continue
                val endUnix = parseXMLDate(prog.stop) ?: continue

                // Use a secure unique ID mapping fallback
                val programId = "${prog.channel}_$startUnix"

                val epgProgram = EPGProgram(
                    id = programId,
                    channelId = prog.channel,
                    title = prog.title.value,
                    description = prog.desc?.value ?: "",
                    startUnix = startUnix,
                    endUnix = endUnix
                )

                epgData.getOrPut(prog.channel) { mutableListOf() }.add(epgProgram)
            }
        } catch (e: Exception) {
            Logger.error("Failed to parse XMLTV", e)
        }

        return epgData
    }
}