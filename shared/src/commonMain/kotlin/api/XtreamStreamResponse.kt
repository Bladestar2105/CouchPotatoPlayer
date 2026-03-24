package api

import kotlinx.serialization.Serializable

@Serializable
data class XtreamStreamResponse(
    val num: Int? = null,
    val name: String? = null,
    val stream_type: String? = null,
    val stream_id: Int? = null,
    val stream_icon: String? = null,
    val epg_channel_id: String? = null,
    val added: String? = null,
    val category_id: String? = null,
    val custom_sid: String? = null,
    val tv_archive: Int? = null,
    val direct_source: String? = null,
    val tv_archive_duration: Int? = null,

    // Movie/Series Specific
    val container_extension: String? = null,
    val rating: String? = null,
    val series_id: Int? = null,
    val cover: String? = null
)
