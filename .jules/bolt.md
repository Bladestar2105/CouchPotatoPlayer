## 2024-03-07 - [Lazy format XMLTV dates to fix parsing loop bottleneck]
**Learning:** Eagerly stringifying timestamps for tens of thousands of EPG programs blocks the main thread and uses excessive memory. A loop with 100k items creating formatted strings takes ~263ms vs ~15ms when just assigning numbers.
**Action:** Always prefer lazy evaluation of display strings (like formatted dates) inside the render function rather than eagerly generating them during the data parsing/ingestion phase for large datasets like XMLTV.

## 2024-10-25 - [Optimize EPG program lookups with binary search]
**Learning:** Finding the current program using a linear O(N) search (e.g., `findIndex`) can be a bottleneck when dealing with large, sorted EPG arrays, especially when the search is executed frequently (like in rendering intervals or for multiple channels).
**Action:** Use binary search utilities like `findCurrentProgramIndex` (which provides O(log N) complexity) instead of linear array methods (`findIndex`, `find`) for lookups on time-sorted program lists.

## 2024-10-26 - [Debounce and cap array iterations for large list filtering]
**Learning:** Running sequential `.filter().map()` operations on massive arrays (e.g., 100k+ channels, movies, and series) on every keystroke in a search input severely blocks the main thread, causing UI freezes. Broad queries (like "a") generate excessive allocations.
**Action:** Always debounce text inputs that trigger heavy computations. For massive datasets, replace sequential array methods with a single-pass `for` loop and implement an early return (e.g., `if (results.length >= 100) break;`) to cap result generation, saving CPU time and preventing memory bloat.
## 2024-10-27 - [Optimize massive array grouping with single-pass loops]
**Learning:** Grouping large datasets (like thousands of IPTV channels or VODs) using chained `.filter().reduce()` followed by `Object.keys().sort().map()` creates significant memory pressure and overhead from intermediate array allocations and closure creation. In benchmarks, switching to a manual, single-pass `for` loop and a pre-allocated array for the final result reduced execution time from ~230ms to ~45ms for 1,000,000 items.
**Action:** When grouping large datasets into categories for UI components (e.g., inside `useMemo`), consolidate `filter` and `reduce` operations into a single `for` loop. For the final conversion to a sorted array of objects, sort the grouping keys first, then use a pre-allocated array (`new Array(keys.length)`) and a manual `for` loop to construct the final items, avoiding `.map()`.
