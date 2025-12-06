import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class TskvLogger implements LoggerService {
  /**
   * Формируем строку в формате TSKV:
   * level=<...>\tmessage=<...>\toptional=<...>
   */
  formatMessage(level: string, message: any, ...optionalParams: any[]) {
    // страхуемся от табов/переносов внутри сообщения
    const safeMessage = String(message).replace(/\t/g, ' ').replace(/\n/g, ' ');

    const parts: string[] = [`level=${level}`, `message=${safeMessage}`];

    if (optionalParams.length) {
      parts.push(`optional=${JSON.stringify(optionalParams)}`);
    }

    return parts.join('\t');
  }

  /**
   * Write a 'log' level log.
   */
  log(message: any, ...optionalParams: any[]) {
    console.log(this.formatMessage('log', message, ...optionalParams));
  }

  /**
   * Write a 'fatal' level log.
   */
  fatal(message: any, ...optionalParams: any[]) {
    console.log(this.formatMessage('fatal', message, ...optionalParams));
  }

  /**
   * Write an 'error' level log.
   */
  error(message: any, ...optionalParams: any[]) {
    console.error(this.formatMessage('error', message, ...optionalParams));
  }

  /**
   * Write a 'warn' level log.
   */
  warn(message: any, ...optionalParams: any[]) {
    console.warn(this.formatMessage('warn', message, ...optionalParams));
  }

  /**
   * Write a 'debug' level log.
   */
  debug(message: any, ...optionalParams: any[]) {
    console.debug(this.formatMessage('debug', message, ...optionalParams));
  }

  /**
   * Write a 'verbose' level log.
   */
  verbose(message: any, ...optionalParams: any[]) {
    console.log(this.formatMessage('verbose', message, ...optionalParams));
  }
}
