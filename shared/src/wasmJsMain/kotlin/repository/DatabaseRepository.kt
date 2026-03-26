package repository

import models.EPGProgram

// In-memory storage for wasm (browser storage would require IndexedDB API)
private val epgStorage = mutableMapOf<String, MutableList<EPGProgram>>()

class InMemoryDatabaseRepository : DatabaseRepository {
    override suspend fun insertEPGPrograms(programs: List<EPGProgram>) {
        programs.forEach { program ->
            val channelPrograms = epgStorage.getOrPut(program.channelId) { mutableListOf() }
            // Remove existing program with same id if exists
            channelPrograms.removeAll { it.id == program.id }
            channelPrograms.add(program)
            // Sort by start time
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

actual fun createDatabaseRepository(): DatabaseRepository = InMemoryDatabaseRepository()