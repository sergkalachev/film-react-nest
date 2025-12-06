import { TskvLogger } from './tskv-logger';

describe('TskvLogger', () => {
  let warnSpy: jest.SpyInstance;
  const tskvLogger = new TskvLogger();

  beforeEach(() => {
    // как у ревьюера, но под наш warn-метод
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockReset();
  });

  it('should log correct TSKV format', () => {
    tskvLogger.warn('hello', { a: 'b', c: 1 });

    expect(warnSpy).toBeCalledTimes(1);
    expect(warnSpy).toBeCalledWith(
      'level=warn\tmessage=hello\toptional=[{"a":"b","c":1}]',
    );
  });
});
