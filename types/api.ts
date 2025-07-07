export interface ApiResponse<T = any> {
    data: T;
    message: string;
    code: string;
  }

export interface User {
  id: string;
  nickname: string;
  avatar?: string; // 이 필드가 나중에 Lovable.dev의 imageUrl로 사용될 것입니다.
}

export interface Player {
  id: string;
  nickname: string;
  avatar?: string; // 이 필드도 마찬가지입니다.
}

export interface Room {
  roomId: string;
  name: string;
  players: Player[];
  // Add other room properties if known, e.g., name, status, etc.
}
