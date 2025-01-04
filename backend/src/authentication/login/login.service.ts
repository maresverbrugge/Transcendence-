import { Injectable, InternalServerErrorException, Inject } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/common/cache';
import { Cache } from 'cache-manager';
import axios from 'axios';
import { UserStatus } from '@prisma/client';

// More info on this section here: https://api.intra.42.fr/apidoc/guides/web_application_flow

@Injectable()
export class LoginService {

  constructor(private prisma: PrismaService, @Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async getToken(response_code: string): Promise<any> {
    // Load the environment variables needed for the login process
    const clientId = process.env.REACT_APP_LOGIN_CLIENT_ID;
    const clientSecret = process.env.REACT_APP_LOGIN_CLIENT_SECRET;
    const redirectUri = 'http://localhost:3000/login/redirect';

    try {
      // Request the token from the 42 API
      const response = await axios.post('https://api.intra.42.fr/oauth/token', {
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: response_code,
        redirect_uri: redirectUri,
      });
      // Return the token to the controller
      return response.data;
    } catch (error) {
      throw new InternalServerErrorException('Error getting authentication token');
    }
  }

  async addUserToDatabase(user: string): Promise<void> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { intraUsername: user },
      });

      if (!existingUser) {
        await this.prisma.user.create({
          data: {
            username: user,
            intraUsername: user,
            Enabled2FA: false,
            status: UserStatus.ONLINE,
          },
        });
      } else {
        await this.prisma.user.update({
          where: { ID: existingUser.ID },
          data: { status: UserStatus.ONLINE },
        });
      }
    } catch (error) {
      throw new InternalServerErrorException('Error while adding user to database');
    }
  }

  async setUserStatusToOffline(intraUsername: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { intraUsername: intraUsername },
        data: { status: UserStatus.OFFLINE },
      });
    } catch (error) {
      throw new InternalServerErrorException('Error while setting user status to offline');
    }
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await axios.get('https://api.intra.42.fr/oauth/token/info', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data || !response.data['expires_in_seconds']) {
        return false;
      } else if (response.data['expires_in_seconds'] <= 0) {
        return false;
      } else {
        return true;
      }
    } catch (error) {
      throw new InternalServerErrorException('Error while verifying authentication token');
    }
  }

  async getIntraName(token: string): Promise<string> {
    try {
      const response = await axios.get('https://api.intra.42.fr/v2/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data.login;
    } catch (error) {
      throw new InternalServerErrorException('Error while getting intra name');
    }
  }

  async getExpiresInSeconds(token: string): Promise<number> {
    try {
      const response = await axios.get('https://api.intra.42.fr/oauth/token/info', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data || !response.data['expires_in_seconds']) {
        throw new InternalServerErrorException('Data not found in response');
      } else {
        return response.data['expires_in_seconds'];
      }
    } catch (error) {
      throw new InternalServerErrorException('Error while getting expires in seconds');
    }
  }

  async getUserFromCache(token: string): Promise<number> {
    try {
      const user = await this.cacheManager.get<number>(token);
      if (!user) {
        throw new InternalServerErrorException('User not found in cache'); // fix error handling here
      }
      return user;
    } catch (error) {
      throw new InternalServerErrorException('Error while getting user from cache');
    }
  }

  async storeUserInCache(token: string, user: number, expiresInSeconds: number): Promise<void> {
    try {
      await this.cacheManager.set(token, user, expiresInSeconds);
    } catch (error) {
      throw new InternalServerErrorException('Error while storing user in cache');
    }
  }
}
