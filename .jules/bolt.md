## 2024-03-07 - [Lazy format XMLTV dates to fix parsing loop bottleneck]
**Learning:** Eagerly stringifying timestamps for tens of thousands of EPG programs blocks the main thread and uses excessive memory. A loop with 100k items creating formatted strings takes ~263ms vs ~15ms when just assigning numbers.
**Action:** Always prefer lazy evaluation of display strings (like formatted dates) inside the render function rather than eagerly generating them during the data parsing/ingestion phase for large datasets like XMLTV.

## 2024-10-25 - [Optimize EPG program lookups with binary search]
**Learning:** Finding the current program using a linear O(N) search (e.g., `findIndex`) can be a bottleneck when dealing with large, sorted EPG arrays, especially when the search is executed frequently (like in rendering intervals or for multiple channels).
**Action:** Use binary search utilities like `findCurrentProgramIndex` (which provides O(log N) complexity) instead of linear array methods (`findIndex`, `find`) for lookups on time-sorted program lists.