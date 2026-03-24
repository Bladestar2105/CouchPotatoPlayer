package repository

import com.couchpotatoplayer.db.AppDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.IO
import kotlinx.coroutines.withContext
import models.EPGProgram

class DatabaseRepository(driverFactory: DriverFactory) {
    private val database = AppDatabase(driverFactory.createDriver())
    private val dbQuery = database.appDatabaseQueries

    suspend fun insertEPGPrograms(programs: List<EPGProgram>) = withContext(Dispatchers.IO) {
        database.transaction {
            programs.forEach { program ->
                dbQuery.insertEPG(
                    id = program.id,
                    channelId = program.channelId,
                    title = program.title,
                    description = program.description,
                    startUnix = program.startUnix,
                    endUnix = program.endUnix
                )
            }
        }
    }

    suspend fun getEPGForChannel(channelId: String): List<EPGProgram> = withContext(Dispatchers.IO) {
        dbQuery.getEPGForChannel(channelId).executeAsList().map {
            EPGProgram(
                id = it.id,
                channelId = it.channelId,
                title = it.title,
                description = it.description,
                startUnix = it.startUnix,
                endUnix = it.endUnix
            )
        }
    }

    suspend fun clearEPG() = withContext(Dispatchers.IO) {
        dbQuery.clearEPG()
    }
}
