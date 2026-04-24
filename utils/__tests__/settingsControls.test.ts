import { describe, expect, test } from './bunTestCompat';
import { getTVBooleanSettingPressHandler } from '../settingsControls';

describe('settingsControls', () => {
  test('returns no row press handler on touch platforms', () => {
    expect(getTVBooleanSettingPressHandler(false, true, () => {})).toBeUndefined();
  });

  test('toggles boolean settings from TV setting rows', () => {
    const values: boolean[] = [];
    getTVBooleanSettingPressHandler(true, true, (nextValue) => values.push(nextValue))?.();
    getTVBooleanSettingPressHandler(true, false, (nextValue) => values.push(nextValue))?.();
    expect(values).toEqual([false, true]);
  });
});
