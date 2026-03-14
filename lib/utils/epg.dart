import '../models/iptv.dart';

String getEpgKey(LiveChannel channel) {
  if (channel.epg_channel_id != null && channel.epg_channel_id!.isNotEmpty) {
    return channel.epg_channel_id!;
  }
  return channel.stream_id?.toString() ?? channel.name;
}

int findCurrentProgramIndex(List<ParsedProgram> programs, int nowTime) {
  if (programs.isEmpty) return -1;
  int low = 0;
  int high = programs.length - 1;

  while (low <= high) {
    int mid = low + ((high - low) >> 1);
    final prog = programs[mid];

    if (nowTime >= prog.start && nowTime < prog.end) {
      return mid;
    } else if (nowTime < prog.start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // fallback to full scan in case they aren't perfectly sorted
  for (int i = 0; i < programs.length; i++) {
    if (nowTime >= programs[i].start && nowTime < programs[i].end) {
      return i;
    }
  }
  return -1;
}

ParsedProgram? getCurrentProgram(List<ParsedProgram> programs, int nowTime) {
  int idx = findCurrentProgramIndex(programs, nowTime);
  return idx != -1 ? programs[idx] : null;
}
