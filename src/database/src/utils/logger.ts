/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

export enum LoggerLevel {
  ERROR, WARN, INFO, DEBUG, TRACE
}

export class Logger {

  private _level: LoggerLevel = LoggerLevel.WARN;

  set level(value: LoggerLevel) {
    this._level = value;
  }

  error(message: any, ...optionalParams: any[]): void {
    console.error(message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]): void {
    if (this._level >= LoggerLevel.WARN) {
      console.warn(message, ...optionalParams);
    }
  }

  info(message: any, ...optionalParams: any[]): void {
    if (this._level >= LoggerLevel.INFO) {
      console.info(message, ...optionalParams);
    }
  }

  debug(message: any, ...optionalParams: any[]): void {
    if (this._level >= LoggerLevel.DEBUG) {
      console.log(message, ...optionalParams);
    }
  }

  trace(message: any, ...optionalParams: any[]): void {
    if (this._level >= LoggerLevel.TRACE) {
      console.log(message, ...optionalParams);
    }
  }
}
