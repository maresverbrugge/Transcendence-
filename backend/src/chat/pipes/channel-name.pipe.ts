import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ChannelNamePipe implements PipeTransform {
  transform(name: any): string {
    if (typeof name !== 'string') {
      throw new BadRequestException('Channel name must be a string');
    }

    if (name.length > 25) {
      throw new BadRequestException('Channel name must not exceed 25 characters');
    }

    return name;
  }
}