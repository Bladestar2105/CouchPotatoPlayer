package api

import io.ktor.client.HttpClient
import io.ktor.client.engine.js.Js

actual fun getHttpClient() = HttpClient(Js) {
    // JS client for wasm
}