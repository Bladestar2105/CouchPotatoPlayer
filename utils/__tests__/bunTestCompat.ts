import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

type MockFactory = (() => any) | (() => Promise<any>);

type BunLikeMock = {
  <T extends (...args: any[]) => any>(impl?: T): ReturnType<typeof vi.fn<T>>;
  module: (path: string, factory: MockFactory) => void;
};

const bunLikeMock = ((impl?: (...args: any[]) => any) => vi.fn(impl)) as BunLikeMock;
bunLikeMock.module = (path: string, factory: MockFactory) => {
  vi.doMock(path, factory as any);
};

function setSystemTime(value?: Date | number): void {
  if (typeof value === 'undefined') {
    vi.useRealTimers();
    return;
  }
  vi.useFakeTimers();
  vi.setSystemTime(value);
}

const spyOn = vi.spyOn.bind(vi);

export {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  bunLikeMock as mock,
  setSystemTime,
  spyOn,
  test,
};
