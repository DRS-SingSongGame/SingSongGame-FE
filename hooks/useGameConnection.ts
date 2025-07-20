// hooks/useGameConnection.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  connectGameSocket,
  disconnectGameSocket,
  isGameSocketConnected,
  stopReconnecting
} from '@/lib/gameSocket';
import api from '@/lib/api';

// gameSocket.ts에서 기대하는 핸들러 타입 정의
interface GameSocketHandlers {
  onConnect?: (frame: any) => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  onMessage?: (msg: any) => void;
  onGameStartCountdown?: (response: any) => void;
  onRoundStart?: (response: any) => void;
  onAnswerCorrect?: (response: any) => void;
  onRoundFailed?: (data: any) => void;
  onGameEnd?: (response: any) => void;
  [key: string]: any; // 추가 핸들러들을 위한 인덱스 시그니처
}

interface GameConnectionProps {
  roomId: string;
  phase: string;
  onConnect?: (frame: any) => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
  onMessage?: (msg: any) => void;
  onGameStartCountdown?: (response: any) => void;
  onRoundStart?: (response: any) => void;
  onAnswerCorrect?: (response: any) => void;
  onRoundFailed?: (data: any) => void;
  onGameEnd?: (response: any) => void;
  onReconnectSuccess?: () => void;
}

export const useGameConnection = ({
  roomId,
  phase,
  ...handlers
}: GameConnectionProps) => {
  const [socketConnected, setSocketConnected] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const isReconnectingRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 게임 핸들러 생성
  const createGameHandlers = useCallback(() => ({
    onConnect: (frame: any) => {
      console.log("WebSocket Connected:", frame);
      setSocketConnected(true);
      setShowConnectionModal(false);
      handlers.onConnect?.(frame);
    },
    onDisconnect: () => {
      console.log("🚨 WebSocket 연결 끊김 감지!");
      setSocketConnected(false);
      setShowConnectionModal(true);
      handlers.onDisconnect?.();
    },
    onError: (error: any) => {
      console.error("WebSocket Error:", error);
      setSocketConnected(false);
      handlers.onError?.(error);
    },
    onMessage: handlers.onMessage,
    onGameStartCountdown: handlers.onGameStartCountdown,
    onRoundStart: handlers.onRoundStart,
    onAnswerCorrect: handlers.onAnswerCorrect,
    onRoundFailed: handlers.onRoundFailed,
    onGameEnd: handlers.onGameEnd,
  }), [handlers]);

  // 수동 재연결
  const handleManualReconnect = useCallback(() => {
    console.log("🔄 수동 재연결 시도");
    console.log("🎯 onReconnectSuccess 콜백 존재 여부:", !!handlers.onReconnectSuccess);
    setIsReconnecting(true);
    isReconnectingRef.current = true;
    
    const reconnectHandlers = {
      ...createGameHandlers(),
      onConnect: async (frame: any) => { // 🆕 async 추가
        console.log("✅ 재연결 성공!");
        console.log("🔍 현재 isReconnecting 상태:", isReconnecting);
        console.log("🔍 현재 isReconnectingRef 값:", isReconnectingRef.current);
        console.log("🔍 콜백 함수 존재:", !!handlers.onReconnectSuccess);
        
        // 재연결 성공 시 콜백 호출 (ref 값으로 체크)
        if (isReconnectingRef.current && handlers.onReconnectSuccess) {
          console.log("🔥 재연결 성공! onReconnectSuccess 콜백 호출 중...");
          handlers.onReconnectSuccess();
        }
        
        setSocketConnected(true);
        setIsReconnecting(false);
        isReconnectingRef.current = false;
        setShowConnectionModal(false);
        
        console.log("🎮 재연결 완료 - 소켓 데이터 대기 중...");
        handlers.onConnect?.(frame);
      }
    };
    
    connectGameSocket(roomId, reconnectHandlers as any, false);
  }, [roomId, createGameHandlers, handlers, phase]);

  // 로비로 나가기
  const handleLeaveToLobby = useCallback(() => {
    setShowConnectionModal(false);
    stopReconnecting();
    disconnectGameSocket();
    window.location.href = '/lobby';
  }, []);

  // 초기 연결
  useEffect(() => {
    const handlers = createGameHandlers();
    connectGameSocket(roomId, handlers as any, false);

    return () => {
      stopReconnecting();
      disconnectGameSocket();
    };
  }, [roomId]); // createGameHandlers는 의존성에서 제외

  // 연결 상태 모니터링
  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      const isConnected = isGameSocketConnected();
      
      if (!isConnected && socketConnected) {
        console.log("🔄 연결 끊김 감지됨!");
        setSocketConnected(false);
        setShowConnectionModal(true);
      } else if (isConnected && !socketConnected) {
        console.log("✅ 연결 복구됨!");
        setSocketConnected(true);
        // 모든 경우에 대해 모달 숨기기
        setShowConnectionModal(false);
      }
    }, 2000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [socketConnected, phase]);

  // 정리
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      stopReconnecting();
      disconnectGameSocket();
    };
  }, []);

  // phase가 변경될 때 모달 상태 정리
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'countdown') {
      setShowConnectionModal(false);
    }
  }, [phase]);

  return {
    socketConnected,
    showConnectionModal,
    isReconnecting,
    handleManualReconnect,
    handleLeaveToLobby
  };
};