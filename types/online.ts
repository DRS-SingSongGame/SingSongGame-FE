// types/online.ts 또는 types/user.ts 등
export interface OnlineUser {
    userId: number;
    username: string;
    imageUrl: string;
    location: 'LOBBY' | 'ROOM';
  }
  