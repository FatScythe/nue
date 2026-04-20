import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ConfigError from '../common/exception';

export class ConfigUtils {
  private readonly logger = new Logger(ConfigUtils.name);
  constructor(private configService: ConfigService) {}

  getRequired<T>(keyName: string): T {
    const value = this.configService.get<T>(keyName);
    if (!value)
      throw new ConfigError(
        `The configuration key '${keyName}' is required and it was missing`,
      );
    return value;
  }

  getWithWarning<T>(keyName: string): T {
    const value = this.configService.get<T>(keyName);
    if (!value) {
      this.logger.warn(
        `The configuration key '${keyName}' is required and it was missing`,
      );
    }
    return value as T;
  }
}
