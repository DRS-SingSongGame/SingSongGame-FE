"use client";

import { Key, useEffect, useRef, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import styles from "./page.module.css";
import { getSocket, disconnectSocket } from "@/lib/keysingyouWebSocket";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Crown,
  CheckCircle,
  Circle,
  Play,
  LogOut,
  Mic,
  MicOff,
} from "lucide-react";

interface User {
  id: string;
  nickname: string;
  avatar: string;
  ready: boolean;
  isHost: boolean;
  sid: string;
  mic: boolean;
}
interface Keyword {
  type: string;
  name: string;
  alias: string[];
}
interface ChatMsg {
  message: string;
}

type Phase =
  | "ready"
  | "intro"
  | "keyword"
  | "record"
  | "listen"
  | "result"
  | "final";

export default function RoomPage() {
  const nickname = useSearchParams().get("nickname") ?? "unknown";
  const roomId = useParams().roomId as string;
  const router = useRouter();

  /* ───── state ───── */
  const [phase, setPhase] = useState<Phase>("ready");
  const [users, setUsers] = useState<User[]>([]);
  const [timer, setTimer] = useState(0);

  const [keyword, setKeyword] = useState<Keyword | null>(null);
  const [currentSid, setCurrentSid] = useState<string>(""); // 차례 SID
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [micReady, setMicReady] = useState(false);
  const [matchedResult, setMatchedResult] = useState<{
    matched: boolean;
    title: string | null;
    artist: string | null;
    score: number;
  } | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [finalScores, setFinalScores] = useState<
    | {
        nickname: string;
        score: number;
      }[]
    | null
  >(null);

  /* ───── refs ───── */
  const mySid = useRef<string>("");
  const socket = useRef<Socket | null>(null);
  const mediaR = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const keywordRef = useRef<Keyword | null>(null);
  const turnRef = useRef<number>(0);

  /* ───── 타이머 1초 감소 ───── */
  useEffect(() => {
    if (!timer) return;
    const iv = setInterval(() => setTimer((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => clearInterval(iv);
  }, [timer]);

  /* ───── 소켓 초기화 ───── */
  useEffect(() => {
    const sock = getSocket();
    socket.current = sock;

    sock.on("connect", () => {
      if (sock.id) {
        mySid.current = sock.id;
        sock.emit("join_room", { roomId, nickname });
      }
    });

    sock.on("room_update", (d: { users: User[] }) => setUsers(d.users));
    sock.on("start_failed", (d: { reason: string }) => alert(d.reason));

    /* ① 전체 게임 인트로 5s */
    sock.on("game_intro", () => {
      setPhase("intro");
      setTimer(5);
    });

    /* ② 키워드 공개 5s */
    sock.on(
      "keyword_phase",
      (d: { playerSid: string; playerNick: string; keyword: Keyword }) => {
        setKeyword(d.keyword);
        keywordRef.current = d.keyword;
        setCurrentSid(d.playerSid);
        setPhase("keyword");
        setTimer(5);
      }
    );

    /* ③ 녹음 10s */
    sock.on("record_begin", (d: { playerSid: string; turn: number }) => {
      setCurrentSid(d.playerSid);
      setPhase("record");
      setTimer(10);
      turnRef.current = d.turn;
      if (d.playerSid === mySid.current)
        startRecording(keywordRef.current as Keyword);
    });

    sock.on("listen_phase", (d: { playerSid: string; audio: string }) => {
      setPhase("listen");
      const src = "data:audio/webm;base64," + d.audio;
      setAudioSrc(src);
    });

    sock.on("round_result", (data) => {
      setMatchedResult(data); // 결과 상태 저장
      setPhase("result"); // result 화면으로 전환
      setTimer(5); // 5초 타이머
    });

    /* 결과 (점수 등) */
    sock.on(
      "game_result",
      (d: { scores: { nickname: string; score: number }[] }) => {
        if (!d?.scores) return;

        const scoreArr = d.scores.slice(); // 복사본 만들어 정렬

        // 점수 높은 순 정렬
        scoreArr.sort((a, b) => b.score - a.score);

        setFinalScores(scoreArr);
        setPhase("final"); // UI 전환
      }
    );

    /* 채팅 */
    sock.on("room_chat", (m: ChatMsg) => setChatMsgs((prev) => [...prev, m]));

    return () => {
      sock.emit("leave_room");
      disconnectSocket();
    };
  }, [roomId, nickname]);

  /* ───── 녹음 함수 (10초 후 stop) ───── */
  async function startRecording(kw: Keyword) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mediaR.current = mr;
    chunks.current = [];

    mr.ondataavailable = (e) => chunks.current.push(e.data);
    mr.start();
    setTimeout(() => mr.stop(), 10_000);

    mr.onstop = async () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });

      socket.current?.emit("submit_recording", {
        roomId,
        playerSid: mySid.current,
        turn: turnRef.current,
        keyword: kw,
        audio: await blob.arrayBuffer(),
      });

      stream.getTracks().forEach((track) => track.stop());
    };
  }

  async function requestMicPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicReady(true);
      socket.current?.emit("mic_ready", { roomId });
    } catch {
      alert("❗ 마이크 권한이 필요합니다.");
    }
  }

  /* ───── 유틸 ───── */
  const isHost = users.find((u) => u.nickname === nickname)?.isHost;

  /* ───── 채팅 보내기 ───── */
  function sendChat() {
    if (!chatInput.trim()) return;
    socket.current?.emit("room_chat", {
      roomId,
      message: `${nickname}: ${chatInput}`,
    });
    setChatInput("");
  }

  /* ───── 나가기 ───── */
  function leaveRoom() {
    socket.current?.emit("leave_room");
    router.push(`/lobby?nickname=${encodeURIComponent(nickname)}`);
  }

  /* ───── Phase별 화면 ───── */
  /* ─── ReadyView ─── */
  const ReadyView = (
    <div className="grid grid-cols-4 gap-4">
      {/* ▶︎ 플레이어 영역 (Card) */}
      <Card className="col-span-3 bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-pink-700 text-lg font-bold">
            👥 참여자
          </CardTitle>
        </CardHeader>

        <CardContent>
          <ul className="space-y-2">
            {users.map((u) => (
              <li
                key={u.sid}
                className="flex items-center justify-between py-1"
              >
                {/* 아바타 + 닉네임 */}
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={u.avatar} />
                    <AvatarFallback>
                      {u.nickname.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{u.nickname}</span>
                  {u.isHost && (
                    <Crown className="w-4 h-4 text-yellow-400 ml-1" />
                  )}
                </div>

                {/* 상태 표시 */}
                <div className="flex items-center gap-2">
                  {!u.isHost && (
                    <>
                      {u.ready ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-red-400" />
                      )}
                    </>
                  )}
                  {u.mic ? (
                    <Mic className="w-5 h-5 text-blue-500" />
                  ) : (
                    <MicOff className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ▶︎ 우측 컨트롤 버튼들 */}
      <div className="flex flex-col gap-3">
        {isHost ? (
          <Button
            disabled={
              !users.filter((u) => !u.isHost).every((u) => u.ready && u.mic)
            }
            onClick={() => socket.current?.emit("start_game")}
            className="bg-green-600 hover:bg-green-700 text-white h-[50px]"
          >
            <Play className="w-4 h-4 mr-2" />
            게임 시작
          </Button>
        ) : (
          <Button
            onClick={() => socket.current?.emit("toggle_ready")}
            className={`h-[50px] text-white ${
              users.find((u) => u.sid === mySid.current)?.ready
                ? "bg-green-500 hover:bg-green-600"
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            }`}
          >
            {users.find((u) => u.sid === mySid.current)?.ready ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                준비 완료
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 mr-2" />
                준비하기
              </>
            )}
          </Button>
        )}

        {!micReady && (
          <Button
            onClick={requestMicPermission}
            className="bg-blue-500 hover:bg-blue-600 text-white h-[50px]"
          >
            🎤 마이크 권한 허용
          </Button>
        )}

        <Button
          onClick={leaveRoom}
          className="bg-red-500 hover:bg-red-600 text-white h-[50px]"
        >
          <LogOut className="w-4 h-4 mr-2" />
          나가기
        </Button>
      </div>
    </div>
  );

  const IntroView = (
    <p className="py-8 text-center">🎮 게임 인트로… {timer}s</p>
  );

  const KeywordView = (
    <div className="py-8 text-center">
      <p>
        {timer}s 후{" "}
        <b>
          {users.find((u) => u.sid === currentSid)?.nickname}
          {currentSid === mySid.current && " (내 차례)"}
        </b>{" "}
        님 녹음 시작
      </p>
    </div>
  );

  const RecordView = (
    <div className="py-8 text-center">
      {currentSid === mySid.current ? (
        <>
          <p className="text-xl font-bold mb-2">키워드: {keyword?.name}</p>
          <p className="text-red-600">🎙️ 내 녹음 중… {timer}s</p>
        </>
      ) : (
        <>
          <p className="text-xl font-bold mb-2">키워드: {keyword?.name}</p>
          <p>
            {users.find((u) => u.sid === currentSid)?.nickname} 님 녹음 중…{" "}
            {timer}s
          </p>
        </>
      )}
    </div>
  );

  const ListenView = (
    <div className="py-8 text-center">
      <p className="text-xl font-bold mb-2">키워드: {keyword?.name}</p>
      <p>🎧 녹음 감상 중…</p>
      {audioSrc && (
        <audio
          src={audioSrc}
          autoPlay
          onEnded={() => socket.current?.emit("listen_finished", { roomId })}
          hidden
        />
      )}
    </div>
  );

  const ResultView = (
    <div className="py-8 text-center space-y-2">
      {matchedResult?.matched ? (
        <>
          <p className="text-3xl font-bold text-green-600">✅ 통과!</p>
          <p className="text-xl">
            {matchedResult.title} - {matchedResult.artist}
          </p>
          <p className="text-2xl font-semibold">
            {matchedResult.score}점 ... {timer} 초 후 넘어갑니다..
          </p>
        </>
      ) : (
        <p className="text-3xl font-bold text-red-500">
          ❌ 실패! 아쉬워요! ... {timer} 초 후 넘어갑니다..
        </p>
      )}
    </div>
  );

  const FinalView = (
    <div className="py-8 text-center space-y-4">
      <h2 className="text-3xl font-bold">🏆 최종 결과</h2>
      {finalScores?.length ? (
        <ol className="space-y-1">
          {finalScores.map(({ nickname, score }, idx) => (
            <li key={nickname} className="text-xl">
              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "⭐"}{" "}
              <b>{nickname}</b> — {score}점
            </li>
          ))}
        </ol>
      ) : (
        <p>점수 데이터가 없습니다.</p>
      )}
    </div>
  );

  function renderPhase() {
    switch (phase) {
      case "intro":
        return IntroView;
      case "keyword":
        return KeywordView;
      case "record":
        return RecordView;
      case "listen":
        return ListenView;
      case "result":
        return ResultView;
      case "final":
        return FinalView;
      default:
        return ReadyView;
    }
  }

  /* ───── UI ───── */
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">🧑‍🤝‍🧑 방 ID: {roomId}</h1>

      {renderPhase()}

      <button
        onClick={leaveRoom}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        🚪 방 나가기
      </button>

      {/* 채팅 */}
      <section className={styles.chatSection}>
        <h2 className={styles.chatHeader}>💬 방 채팅</h2>
        <div id="room-chat-box" className={styles.chatBox}>
          {chatMsgs.length === 0 ? (
            <p className="text-gray-500 italic">채팅이 없습니다.</p>
          ) : (
            chatMsgs.map((c, i) => (
              <p key={i} className={styles.chatMessage}>
                {c.message}
              </p>
            ))
          )}
        </div>
        <div className={styles.chatInputRow}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
            placeholder="메시지 입력"
            className={styles.chatInput}
          />
          <button onClick={sendChat} className={styles.chatButton}>
            전송
          </button>
        </div>
      </section>
    </main>
  );
}
