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

## 2024-10-28 - [Avoid toLocaleTimeString in hot render paths]
**Learning:** `Date.prototype.toLocaleTimeString()` uses the Intl API internally, which comes with significant overhead. Calling it thousands of times within the render cycle of a virtualized list or a dense grid (like an EPG timeline) creates a measurable UI bottleneck and blocks the main thread. A manual formatter loses user's locale formatting (e.g. 12h vs 24h formats).
**Action:** In high-frequency rendering components that need simple date formatting (like `HH:MM`), instantiate `Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })` once outside the component and reuse its `.format()` method to safely preserve locale while gaining a massive performance boost.

## 2024-10-29 - [Optimize high-frequency array searches with Sets]
**Learning:** Using `Array.prototype.some()` inside a hot render path (like `isFavorite` called for every channel rendered in an EPG timeline or list) causes O(N) lookups that block the main thread. With 10,000 channels and 1,000 favorites, this scales terribly and creates severe stuttering.
**Action:** When a boolean check (like "is this item in a list?") is executed repeatedly during render cycles, convert the source array into a `Set` using `useMemo` (e.g., `new Set(items.map(i => i.id))`). This upgrades the lookup from O(N) to O(1) via `Set.prototype.has()`, drastically improving rendering performance for large lists.
