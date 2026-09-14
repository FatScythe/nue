import { Request } from 'express';

import { CoreReqUser, PortalReqUser } from '../types';

export interface PortalRequest extends Request {
  user?: PortalReqUser;
}

export interface CoreRequest extends Request {
  user?: CoreReqUser;
}
