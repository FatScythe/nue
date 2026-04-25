import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async generateToken(
    payload: { sub: string; email: string } | { sub: string },
    options?: {
      expiresIn?: number;
    },
  ) {
    return {
      access_token: this.jwtService.sign(payload, {
        ...(options?.expiresIn && { expiresIn: options.expiresIn }),
      }),
    };
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      return null;
    }
  }
}
