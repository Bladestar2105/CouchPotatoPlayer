## 2026-04-03 - [Fix Settings screen layout and Home TV borders]
**What:** Fixed a numeric render crash caused by `{pin &&}`, standardized the layout of trailing Settings buttons (Theme/Logout), enlarged the 'Last Viewed' buttons (scaling from 180 to 320 points on TV) to match UHF modern design, and conditionally stripped `SafeAreaView` `edges` on tvOS to remove thick black layout margins.
**Why:** To resolve a black screen regression and modernize the TV UI viewing experience, ensuring components fully utilize screen estate and interactive elements maintain alignment.
**Before/After:** The Last Viewed buttons are now noticeably thicker and more legible. Settings items all align horizontally. tvOS UI no longer has artificial top/bottom/side black letterboxing.
**Accessibility:** Preserved role `button` hints and added descriptive labels inside the `tileLeft` layout structure.
