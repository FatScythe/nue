import { SetMetadata } from '@nestjs/common';

export const IS_NON_TOKEN = 'isNonToken';
export const NoToken = () => SetMetadata(IS_NON_TOKEN, true);
