export function getTVBooleanSettingPressHandler(
  isTV: boolean,
  value: boolean,
  onValueChange: (nextValue: boolean) => void,
): (() => void) | undefined {
  if (!isTV) return undefined;
  return () => onValueChange(!value);
}
