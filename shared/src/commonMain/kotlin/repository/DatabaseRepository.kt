package repository

import models.EPGProgram

// Interface for database operations - implemented differently per platform
interface DatabaseRepository {
    suspend fun insertEPGPrograms(programs: List<EPGProgram>)
    suspend fun getEPGForChannel(channelId: String): List<EPGProgram>
    suspend fun clearEPG()
}

// Factory to create platform-specific database repository
expect fun createDatabaseRepository(): DatabaseRepository