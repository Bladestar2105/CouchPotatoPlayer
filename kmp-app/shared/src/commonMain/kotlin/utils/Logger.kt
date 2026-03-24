package utils

/**
 * A basic multiplatform logger replacing the TypeScript Logger utility.
 * In a real application, you might use a KMP library like Napier.
 */
object Logger {
    var isEnabled: Boolean = true

    fun log(message: String) {
        if (!isEnabled) return
        println("[LOG] $message")
    }

    fun info(message: String) {
        if (!isEnabled) return
        println("[INFO] $message")
    }

    fun debug(message: String) {
        if (!isEnabled) return
        println("[DEBUG] $message")
    }

    fun error(message: String, throwable: Throwable? = null) {
        if (!isEnabled) return
        println("[ERROR] $message")
        throwable?.printStackTrace()
    }
}