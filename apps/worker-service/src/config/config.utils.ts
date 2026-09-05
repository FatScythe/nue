import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class ConfigUtils {
  private readonly logger = new Logger(ConfigUtils.name);
  constructor(private configService: ConfigService) {}

  getRequired<T>(keyName: string): T {
    const value = this.configService.get<T>(keyName);
    if (!value)
      throw new Error(
        `[CONFIG_ERR]: The configuration key '${keyName}' is required and it was missing`,
      );
    return value;
  }

  getWithWarning<T>(keyName: string): T {
    const value = this.configService.get<T>(keyName);
    if (!value) {
      this.logger.warn(
        `[CONFIG_ERR]: The configuration key '${keyName}' is required and it was missing`,
      );
    }
    return value as T;
  }
}
