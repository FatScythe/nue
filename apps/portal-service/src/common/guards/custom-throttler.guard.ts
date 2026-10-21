import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

import { getIp } from '@libs/common';

import { ClientException } from '../exceptions';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return getIp(req);
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();

    if (request.url && request.url.includes('resend-invite')) {
      const detail = throttlerLimitDetail as any;
      const rawTime = detail.timeToExpire || detail.ttl || 0;

      const totalSecondsLeft =
        rawTime > 10000 ? Math.ceil(rawTime / 1000) : rawTime;

      const minutes = Math.floor(totalSecondsLeft / 60);
      const seconds = totalSecondsLeft % 60;

      let countdownMessage = '';
      if (minutes > 0) {
        countdownMessage = `${minutes}m ${seconds}s`;
      } else {
        countdownMessage = `${seconds}s`;
      }

      throw new ClientException(
        `An invitation was recently sent for this user. Please wait ${countdownMessage} before trying again.`,
        'CT001',
        { ttl: rawTime },
      );
    }

    throw new ClientException('Too Many Requests.', 'CT000');
  }
}
