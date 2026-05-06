import { Request } from 'express';
import { PortalReqUser, CoreReqUser } from '../types';

export interface PortalRequest extends Request {
  user?: PortalReqUser;
}

export interface CoreRequest extends Request {
  user?: CoreReqUser;
}
