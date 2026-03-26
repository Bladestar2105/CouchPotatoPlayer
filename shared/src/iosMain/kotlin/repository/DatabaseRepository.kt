package repository

import models.EPGProgram

// In-memory storage for iOS (can be replaced with Core Data later)
private val epgStorage = mutableMapOf<String, MutableList<EPGProgram>>()

class IosDatabaseRepository : DatabaseRepository {
    override suspend fun insertEPGPrograms(programs: List<EPGProgram>) {
        programs.forEach { program ->
            val channelPrograms = epgStorage.getOrPut(program.channelId) { mutableListOf() }
            channelPrograms.removeAll { it.id == program.id }
            channelPrograms.add(program)
            channelPrograms.sortBy { it.startUnix }
        }
    }

    override suspend fun getEPGForChannel(channelId: String): List<EPGProgram> {
        return epgStorage[channelId]?.toList() ?: emptyList()
    }

    override suspend fun clearEPG() {
        epgStorage.clear()
    }
}

actual fun createDatabaseRepository(): DatabaseRepository = IosDatabaseRepository()