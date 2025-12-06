import { JsonLogger } from './json-logger';

describe('JsonLogger', () => {
  let logger: JsonLogger;

  beforeEach(() => {
    logger = new JsonLogger();
  });

  describe('formatMessage', () => {
    it('должен возвращать корректную JSON-строку с level, message и optionalParams', () => {
      const result = logger.formatMessage('log', 'test message', 'a', 1);

      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        level: 'log',
        message: 'test message',
        optionalParams: ['a', 1],
      });
    });
  });

  describe('log уровни', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let consoleDebugSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      consoleDebugSpy = jest
        .spyOn(console, 'debug')
        .mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('log должен вызывать formatMessage с level=log и пробрасывать результат в console.log', () => {
      const formatSpy = jest
        .spyOn(logger, 'formatMessage')
        .mockReturnValue('formatted-log');

      logger.log('hello', 'param1');

      expect(formatSpy).toHaveBeenCalledWith('log', 'hello', ['param1']);
      expect(consoleLogSpy).toHaveBeenCalledWith('formatted-log');
    });

    it('fatal должен вызывать formatMessage с level=fatal и писать в console.log', () => {
      const formatSpy = jest
        .spyOn(logger, 'formatMessage')
        .mockReturnValue('formatted-fatal');

      logger.fatal('fatal error', 'p1', 'p2');

      expect(formatSpy).toHaveBeenCalledWith('fatal', 'fatal error', [
        'p1',
        'p2',
      ]);
      expect(consoleLogSpy).toHaveBeenCalledWith('formatted-fatal');
    });

    it('error должен вызывать formatMessage с level=error и писать в console.error', () => {
      const formatSpy = jest
        .spyOn(logger, 'formatMessage')
        .mockReturnValue('formatted-error');

      logger.error('oops', 'e1');

      expect(formatSpy).toHaveBeenCalledWith('error', 'oops', ['e1']);
      expect(consoleErrorSpy).toHaveBeenCalledWith('formatted-error');
    });

    it('warn должен вызывать formatMessage с level=warn и писать в console.warn', () => {
      const formatSpy = jest
        .spyOn(logger, 'formatMessage')
        .mockReturnValue('formatted-warn');

      logger.warn('careful', 123);

      expect(formatSpy).toHaveBeenCalledWith('warn', 'careful', [123]);
      expect(consoleWarnSpy).toHaveBeenCalledWith('formatted-warn');
    });

    it('debug должен вызывать formatMessage с level=debug и писать в console.debug', () => {
      const formatSpy = jest
        .spyOn(logger, 'formatMessage')
        .mockReturnValue('formatted-debug');

      logger.debug('debug msg');

      expect(formatSpy).toHaveBeenCalledWith('debug', 'debug msg', []);
      expect(consoleDebugSpy).toHaveBeenCalledWith('formatted-debug');
    });

    it('verbose должен вызывать formatMessage с level=verbose и писать в console.log', () => {
      const formatSpy = jest
        .spyOn(logger, 'formatMessage')
        .mockReturnValue('formatted-verbose');

      logger.verbose('verbose msg', 'extra');

      expect(formatSpy).toHaveBeenCalledWith('verbose', 'verbose msg', [
        'extra',
      ]);
      expect(consoleLogSpy).toHaveBeenCalledWith('formatted-verbose');
    });
  });
});
