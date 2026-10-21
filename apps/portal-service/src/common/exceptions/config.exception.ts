export default class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.constructor = ConfigError;
    Object.setPrototypeOf(this, ConfigError.prototype);
  }
}
