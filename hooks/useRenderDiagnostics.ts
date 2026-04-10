import { useEffect, useRef } from 'react';
import Logger from '../utils/logger';

type DiagnosticsValues = Record<string, unknown>;

export const useRenderDiagnostics = (componentName: string, values: DiagnosticsValues) => {
  const renderCountRef = useRef(0);
  const previousRef = useRef<DiagnosticsValues>(values);

  useEffect(() => {
    if (!__DEV__) return;

    renderCountRef.current += 1;
    const changedKeys = Object.keys(values).filter(
      key => previousRef.current[key] !== values[key]
    );

    if (changedKeys.length > 0 && renderCountRef.current % 10 === 0) {
      Logger.log(`[Perf] ${componentName} renders=${renderCountRef.current}`, changedKeys);
    }

    previousRef.current = values;
  });
};
