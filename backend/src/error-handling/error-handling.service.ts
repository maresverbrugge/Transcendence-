import { HttpException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class ErrorHandlingService {

    throwHttpException(error: any):void {
        if (error instanceof HttpException) {
            throw error;
        } else {
            throw new InternalServerErrorException('An unexpected error occurred', error.message);
        }
    }

    emitHttpException(error: any, socket: Socket):void {
        if (!(error instanceof HttpException)) {
            error = new InternalServerErrorException('An unexpected error occurred', error.message);   
        }
        console.error(error)
        if (socket?.connected) {
            socket.emit('error', error)
        }
    }
}
