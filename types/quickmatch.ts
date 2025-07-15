// A base user type that might come from auth/session
export interface BaseUser {
  id: string;
  nickname: string;
  avatar: string;
}

// A more detailed player type for use within the game/matching context
export interface Player extends BaseUser {
  level: number;
  mmr: number;
}

export interface MatchedRoom {
  id: number;
  name: string;
  gameMode: string;
  description: string;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
  roomId: string;
  roomType: string;
}

export interface QuickMatchPopupProps {
  user: BaseUser;
  isOpen: boolean;
  onClose: () => void;
  onMatchFound: (room: MatchedRoom) => void;
}
