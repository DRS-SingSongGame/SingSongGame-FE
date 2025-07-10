import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Mic, Crown, Play, Circle, LogOut, Trophy, ArrowLeft } from "lucide-react";
import { getSocket, disconnectSocket } from "@/lib/keysingyouWebSocket";
import { CardContent } from "./ui/Card";
import { CardTitle } from "./ui/Card";
import { CardHeader } from "./ui/Card";
import { Card } from "./ui/Card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import KeysingyouChatBox from "@/components/chat/KeysingyouChatBox";
import api from "@/lib/api";
import { Button } from "./ui/Button";
import { Badge } from "./ui/badge";
import KeysingyouPlayerSlots from "@/components/ui/KeysingyouPlayerSlots";
import { TimerCircle } from "./ui/TimerCircle";
import { Progress } from "./ui/Progress";
import AudioVisualizer from "./ui/AudioVisualizer";
import { getSharedAudioCtx } from "@/lib/sharedAudioCtx";

interface GameRoomProps {
  user: any;
  room: any;
  onBack: () => void;
}

interface User {
  id: string;
  avatar: string;
  nickname: string;

  sid: string;
  isHost: boolean;

  ready: boolean;
  mic: boolean;
}

interface Keyword {
  type: string;
  name: string;
  alias: string[];
}

interface ChatMessage {
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

const KeysingyouGameRoom = ({ user, room, onBack }: GameRoomProps) => {
  const nickname = user.nickname;
  const roomId = useParams().roomId as string;
  const router = useRouter();

  /* ───── state ───── */
  const [phase, setPhase] = useState<Phase>("ready");
  const [users, setUsers] = useState<User[]>([]);
  const [timer, setTimer] = useState(0);
  const [round, setRound] = useState(1);
  const [maxRound, setMaxRound] = useState(1);
  const [keyword, setKeyword] = useState<Keyword | null>(null);
  const [currentSid, setCurrentSid] = useState<string>(""); // 차례 SID
  const [currentPlayerNick, setCurrentPlayerNick] = useState("");
  const [chatMsgs, setChatMsgs] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [micReady, setMicReady] = useState(false);
  const [matchedResult, setMatchedResult] = useState<{
    matched: boolean;
    title: string | null;
    artist: string | null;
    score: number;
  } | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState<"분석중" | "대조중">("분석중");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [finalScores, setFinalScores] = useState<
    | {
      nickname: string;
      score: number;
    }[]
    | null
  >(null);
  const [isComposing, setIsComposing] = useState(false);

  /* ───── refs ───── */
  const mySid = useRef<string>("");
  const socket = useRef<Socket | null>(null);
  const mediaR = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const keywordRef = useRef<Keyword | null>(null);
  const turnRef = useRef<number>(0);
  const roomChatBoxRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  /* ───── 타이머 1초 감소 ───── */
  useEffect(() => {
    if (!timer) return;
    const iv = setInterval(() => setTimer((t) => (t <= 1 ? 0 : t - 1)), 1000);
    return () => clearInterval(iv);
  }, [timer]);

  useEffect(() => {
    if (roomChatBoxRef.current) {
      roomChatBoxRef.current.scrollTop = roomChatBoxRef.current.scrollHeight;
    }
  }, [chatMsgs]);

  useEffect(() => {
    if (audioSrc && audioRef.current) {
      audioRef.current.load();

      const tryPlay = async () => {
        try {
          // ① 같은 AudioContext를 얻어와서 resume
          const audioCtx = getSharedAudioCtx();
          await audioCtx.resume();

          await audioRef.current!.play();   // ② 실제 재생
        } catch (err) {
          console.warn("Autoplay 재생 실패:", err);
        }
      };
      tryPlay();
    }
  }, [audioSrc]);


  useEffect(() => {
    if (phase === "listen") {
      setAnalysisStep("분석중");
      const timer = setTimeout(() => setAnalysisStep("대조중"), 5000);
      return () => clearTimeout(timer);
    }
  }, [phase, audioSrc]);

  // 게임 모드 라벨 및 색상 함수 (기존과 동일)
  const getGameModeColor = (mode: string) => {
    switch (mode) {
      case "KEY_SING_YOU":
        return "bg-gradient-to-r from-pink-500 to-purple-500";
      case "RANDOM_SONG":
        return "bg-gradient-to-r from-blue-500 to-cyan-500";
      case "PLAIN_SONG":
        return "bg-gradient-to-r from-green-500 to-emerald-500";
      case "놀라운 토요일":
        return "bg-gradient-to-r from-orange-500 to-yellow-500";
      default:
        return "bg-gradient-to-r from-gray-500 to-slate-500";
    }
  };
  const getGameModeLabel = (mode: string) => {
    switch (mode) {
      case "KEY_SING_YOU":
        return "키싱유";
      case "RANDOM_SONG":
        return "랜덤 노래 맞추기";
      case "PLAIN_SONG":
        return "평어 노래 맞추기";
      default:
        return "알 수 없음";
    }
  };

  // WebSocket 연결
  useEffect(() => {
    if (!user) return; // user 정보가 없으면 실행하지 않음
    const sock = getSocket();
    socket.current = sock;

    sock.on("connect", () => {
      if (sock.id) {
        mySid.current = sock.id;
        sock.emit("join_room", {
          roomId,
          userId: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
        });
      }
    });

    sock.on("room_update", (d: { users: User[] }) => setUsers(d.users));
    sock.on("start_failed", (d: { reason: string }) => alert(d.reason));

    /* 전체 게임 인트로 10s */
    sock.on("game_intro", (d: { round?: number; maxRounds?: number }) => {
      if (d.round) setRound(d.round);
      if (d.maxRounds) setMaxRound(d.maxRounds);

      setScores({});
      setPhase("intro");
      setTimer(10);
    });

    /* 키워드 공개 5s */
    sock.on(
      "keyword_phase",
      (d) => {
        setRound(d.round)
        setMaxRound(d.maxRounds);
        setKeyword(d.keyword);
        keywordRef.current = d.keyword;
        setCurrentSid(d.playerSid);
        setCurrentPlayerNick(d.playerNick);
        setPhase("keyword");
        setTimer(5);
      }
    );

    /* 녹음 10s */
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
      setScores(prev => ({
        ...prev,
        [data.playerNick]: (prev[data.playerNick] ?? 0) + data.score
      }));

      setMatchedResult(data); // 결과 상태 저장
      setPhase("result"); // result 화면으로 전환
      setTimer(5); // 5초 타이머
    });

    /* 결과 (점수 등) */
    sock.on(
      "game_result",
      (d: { scores: { nickname: string; score: number }[] }) => {
        const table: Record<string, number> = {};
        d.scores.forEach(({ nickname, score }) => (table[nickname] = score));

        setScores(table);
        setFinalScores(d.scores.sort((a, b) => b.score - a.score));
        setPhase("final");
      }
    );

    /* 채팅 */
    sock.on("room_chat", (m: ChatMessage) =>
      setChatMsgs((prev) => [...prev, m])
    );

    return () => {
      sock.emit("leave_room");
      disconnectSocket();
    };
  }, [roomId, nickname, user]);

  useEffect(() => {
    const audio = new Audio('/audio/entersound.wav');
    audio.play();
  }, []);

  const handleLeaveRoom = async () => {
    try {
      await api.delete(`/api/room/${room.roomId}/leave`);
      router.push("/lobby");
    } catch (error) {
      alert("방 나가기에 실패했습니다.");
      router.push("/lobby");
    }
  };

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
  function sendChat(msg: string) {
    if (!msg.trim()) return;
    socket.current?.emit("room_chat", {
      roomId,
      message: `${nickname}: ${msg.trim()}`,
    });
    setChatInput("");
  }

  /* ───── 나가기 ───── */
  function leaveRoom() {
    socket.current?.emit("leave_room");
    handleLeaveRoom();
    router.push(`/lobby`);
  }

  const renderGamePhase = () => {
    switch (phase) {
      case 'ready':
        return (
          <div className="min-h-[100vh] h-[800px] p-4">
            <div className="max-w-screen-xl mx-auto space-y-4 h-full">
              {/* ── 방 제목 ───────────────────────── */}
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-pink-700">
                    {room.roomName}
                  </CardTitle>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-4 gap-4 h-[calc(100%-100px)]">
                {/* ── 좌측 3/4 영역 (플레이어 슬롯 + 채팅) ───────────────────── */}
                <div className="col-span-3 h-full flex flex-col gap-4">
                  {/* 플레이어 슬롯 */}
                  <Card className="bg-white/90 backdrop-blur-sm flex-1">
                    <CardContent>
                      <KeysingyouPlayerSlots
                        users={users}
                        maxPlayer={room.maxPlayer}
                      />
                    </CardContent>
                  </Card>

                  {/* 채팅 */}
                  <div className="bg-white rounded-2xl flex flex-col w-full min-h-[300px] p-6">
                    {/* 상단 제목 */}
                    <div className="text-2xl font-extrabold text-black mb-4 text-left">방 채팅</div>
                    {/* 채팅 메시지 영역 */}
                    <div className="flex-1 mb-4">
                      <div ref={roomChatBoxRef} className="flex flex-col justify-end h-[200px] min-h-[200px] max-h-[200px] overflow-y-auto scrollbar-hide bg-[#fafbfc] rounded-xl px-4 py-2 border border-[#f0f0f0]">
                        {chatMsgs.length === 0 ? (
                          <div className="text-gray-300 text-base text-center my-auto select-none">&nbsp;</div>
                        ) : (
                          chatMsgs.map((c, i) => (
                            <div key={i} className="flex items-center w-full text-base py-0.5">
                              <span className="font-bold text-black mr-1">{c.message.split(":")[0]}:</span>
                              <span className="ml-1 whitespace-pre-line break-all flex-1 text-black">{c.message.split(":").slice(1).join(":")}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    {/* 입력창 + 전송 버튼 */}
                    <div className="flex gap-2 w-full">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isComposing) sendChat(chatInput);
                        }}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={() => setIsComposing(false)}
                        placeholder="메시지를 입력하세요..."
                        className="flex-1 min-w-0 rounded-xl border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white text-gray-700"
                        style={{ boxShadow: 'none' }}
                      />
                      <button
                        onClick={() => sendChat(chatInput)}
                        className="rounded-xl bg-[#1439e4] hover:bg-[#102db3] text-white font-bold text-base px-8 py-3 transition-colors"
                        style={{ minWidth: '90px' }}
                      >
                        전송
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── 우측 1/4 영역 (방 정보 + 액션 버튼) ───────────────────── */}
                <div className="flex flex-col h-full">
                  <Card className="bg-white/90 backdrop-blur-sm flex flex-col justify-between h-full">
                    {/* 방 정보 */}
                    <div>
                      <CardHeader>
                        <CardTitle className="text-pink-700">방 정보</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 flex-1">
                        <div>
                          <span className="font-medium">게임 모드:</span>{" "}
                          <Badge className={getGameModeColor(room.roomType)}>
                            {getGameModeLabel(room.roomType)}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">방장:</span>{" "}
                          <span>{users.find((u) => u.isHost)?.nickname ?? "-"}</span>
                        </div>
                        <div>
                          <span className="font-medium">인원:</span>{" "}
                          <span>
                            {users.length} / {room.maxPlayer}
                          </span>
                        </div>
                      </CardContent>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex flex-col gap-2 p-4">
                      <Button
                        onClick={requestMicPermission}
                        className="w-full bg-green-600 hover:bg-green-700 text-white h-[50px] text-lg"
                      >
                        <Mic className="mr-2 h-4 w-4" /> 마이크 허용
                      </Button>
                      {isHost ? (
                        <Button
                          disabled={
                            !users.every((u) => u.ready && u.mic) || users.length < 1
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full h-[50px] text-lg"
                          onClick={() =>
                            // 향후 room에 maxRound 추가 시 수정 필요
                            socket.current?.emit("start_game", { roomId, maxRounds: 2 })
                          }
                        >
                          <Play className="w-4 h-4 mr-2" /> 게임 시작
                        </Button>
                      ) : (
                        <Button
                          onClick={() =>
                            socket.current?.emit("toggle_ready", { roomId })
                          }
                          className={`w-full h-[50px] text-lg bg-green-500 hover:bg-green-600 text-white`}
                        >
                          <Circle className="w-4 h-4 mr-2" /> 준비하기
                        </Button>
                      )}

                      <Button
                        className="w-full h-[50px] bg-red-500 hover:bg-red-600 text-white text-lg"
                        onClick={leaveRoom}
                      >
                        <LogOut className="w-4 h-4 mr-2" /> 나가기
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        );

      case 'intro':
        return (
          <div className="flex flex-col justify-center items-center min-h-[500px] h-full">
            <div className="text-6xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent animate-bounce mb-6">
              🎤
            </div>
            <div className="space-y-4 mb-10 text-center">
              <h2 className="text-3xl font-bold text-gray-900">게임 시작!</h2>
              <p className="text-xl text-gray-600">
                잠시 후 키싱유 게임이 시작됩니다.<br /><br />
                각자 주어진 키워드가 들어간 노래를 <span className="font-bold text-pink-600">10초</span>동안 불러주세요!<br />
                허밍도 가능하지만, 가사를 같이 부르면 성공 확률이 높아집니다.
                <br /><br />성공 시 실제 노래와 비슷할수록 높을 점수를 획득합니다!
              </p>
            </div>
            <div className="mt-8">
              <TimerCircle timeLeft={timer} duration={10} size={100} />
            </div>
          </div>
        );

      case 'keyword':
        return (
          <div className="text-center space-y-8">
            <div className="bg-green-500 text-white rounded-lg p-8 transform hover:scale-105 transition-all shadow-xl w-auto inline-block">
              <h2 className="text-4xl font-bold mb-2">{keyword?.type}</h2>
              <div className="text-6xl font-bold">{keyword?.name}</div>
            </div>
            <p className="text-xl text-gray-700">
              <span className="font-bold text-blue-600">{users.find((u) => u.sid === currentSid)?.nickname}</span> 님의 차례입니다
              {currentSid === mySid.current && (
                <span className="ml-2 text-green-600 font-bold">(내 차례)</span>
              )}
            </p>
            <TimerCircle timeLeft={timer} duration={5} size={100} />
          </div>
        );

      case 'record':
        // 현재 턴이 내 턴이 아닐 때 분기 렌더링
        if (mySid.current !== currentSid) {
          return (
            <div className="flex flex-col justify-center items-center min-h-[500px] h-full">
              <div className="bg-green-500 text-white rounded-lg p-4 mb-8">
                <h2 className="text-2xl font-bold">{keyword?.type}: {keyword?.name}</h2>
              </div>
              <div className="space-y-6 flex flex-col items-center">
                <div className="text-2xl font-semibold text-gray-800 mb-4">
                  <span className="font-bold text-blue-600">{users.find((u) => u.sid === currentSid)?.nickname}</span>님이 녹음 중입니다.
                </div>
                <TimerCircle timeLeft={timer} duration={10} size={80} />
              </div>
            </div>
          );
        }
        // 내 턴일 때 기존 UI
        return (
          <div className="flex flex-col justify-center items-center min-h-[500px] h-full">
            <div className="bg-green-500 text-white rounded-lg p-4 mb-8">
              <h2 className="text-2xl font-bold">{keyword?.type} {keyword?.name}</h2>
            </div>
            <div className="space-y-6 flex flex-col items-center">
              <div className="relative flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center animate-pulse">
                  <Mic className="w-12 h-12 text-white" />
                </div>
                <div className="mt-3">
                  <Badge className="bg-red-500 text-white">녹음 중</Badge>
                </div>
              </div>
              <div className="space-y-4 flex flex-col items-center">
                <div className="text-3xl font-bold text-red-600">
                  {timer}초 남음
                </div>
                <Progress value={(10 - timer) * 10} className="w-64 mx-auto" />
              </div>
            </div>
          </div>
        );

      case 'listen':
        return (
          <div className="text-center space-y-8">
            <div className="bg-blue-500 text-white rounded-lg p-6 inline-block">
              <h2 className="text-2xl font-bold mb-2">음성 분석 중</h2>
              <p className="text-xl">{users.find((u) => u.sid === currentSid)?.nickname} 님의 녹음 재생중..</p>
            </div>
            <audio
              src={audioSrc ?? undefined}
              ref={audioRef}
              autoPlay
              hidden
              className="w-full mb-4"
              onEnded={() =>
                socket.current?.emit("listen_finished", { roomId })
              }
            />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {analysisStep === "분석중" ? (
                  <>
                    녹음된 <span className="text-blue-600 font-bold">음성 파형</span>을 분석하고 있습니다..
                  </>
                ) : (
                  <>
                    <span className="text-blue-600 font-bold">실제 음원의 파형</span>과 대조 중입니다..
                  </>
                )}
              </h3>
              <AudioVisualizer audioRef={audioRef} />
            </div>
          </div>
        );

      case 'result':
        if (!matchedResult) return null;

        const { matched, title, artist, score } = matchedResult;
        const passed = matched;
        const badgeColor = passed
          ? 'bg-gradient-to-r from-green-400 to-emerald-500'
          : 'bg-gradient-to-r from-red-400 to-pink-500';
        const textColor = passed
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent'
          : 'bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent';

        return (
          <div className="text-center space-y-8">
            {/* ✔ / ✖ 아이콘 */}
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${badgeColor}`}>
              <span className="text-6xl">{passed ? '✅' : '❌'}</span>
            </div>

            {/* 결과 텍스트 */}
            <div className="space-y-4">
              <h3 className={`text-2xl font-bold ${textColor}`}>
                {passed
                  ? `정답! +${score}점`
                  : `아쉬워요! 다음 기회에!`}
              </h3>

              {/* 성공일 때만 노래 정보 보여주기 */}
              {passed && title && artist && (
                <div className="bg-neutral-100 rounded-lg p-4">
                  <p className="text-gray-700">🎵 {title} - {artist}</p>
                </div>
              )}
            </div>

            {/* 원형 타이머 */}
            <TimerCircle
              timeLeft={timer}
              duration={5}
              size={80}
            />
          </div>
        );

      case 'final':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-yellow-500 text-white rounded-lg p-6 inline-block">
                <Trophy className="w-12 h-12 mx-auto mb-2" />
                <h1 className="text-3xl font-bold">최종 결과</h1>
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {finalScores && finalScores.map((ranking, index) => (
                <div
                  key={ranking.nickname}
                  className={`flex items-center justify-between p-4 rounded-xl shadow-sm border ${index === 0
                    ? 'bg-yellow-50 border-yellow-200'
                    : index === 1
                      ? 'bg-gray-50 border-gray-200'
                      : index === 2
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-white border-gray-100'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${index === 0
                      ? 'bg-yellow-500 text-white'
                      : index === 1
                        ? 'bg-gray-400 text-white'
                        : index === 2
                          ? 'bg-orange-400 text-white'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                      {index + 1}
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {ranking.nickname}
                    </span>
                  </div>

                  <div className="text-xl font-bold text-gray-900 ml-8">
                    {ranking.score}점
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button
                onClick={handleLeaveRoom}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
              >
                로비로 돌아가기
              </Button>
            </div>
          </div>
        );

      default:
        return <div>Loading...</div>;
    }
  };

  const phaseNames = {
    ready: '준비',
    intro: '인트로',
    keyword: '키워드',
    record: '녹음',
    listen: '재생',
    result: '결과',
    final: '최종'
  };

  if (phase === "ready") {
    // ready 페이즈는 전체 페이지를 차지
    return (
      <div className="relative min-h-screen p-4">
        {/* 배경 레이어 */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-purple-500 via-blue-500 to-cyan-400 opacity-0 pointer-events-none" />
        {/* 실제 컨텐츠 */}
        <div className="relative z-10">
          {renderGamePhase()}
        </div>
      </div>
    );
  }

  // 게임 진행 중 레이아웃 (스케치 참고)
  return (
    <div className="relative min-h-screen p-4">
      {/* 배경 레이어 */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-purple-500 via-blue-500 to-cyan-400 opacity-0 pointer-events-none" />
      {/* 실제 컨텐츠 */}
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-4 w-full px-4">
          <Card className="bg-white/90 backdrop-blur-sm border-0 w-full h-[80px]">
            <CardHeader className="h-full px-6 py-0">
              <div className="h-full flex flex-row items-center w-full gap-4">
                {/* 왼쪽: 게임 나가기 버튼 */}
                <Button
                  variant="outline"
                  onClick={handleLeaveRoom}
                  className="bg-white/90 flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  게임 나가기
                </Button>
                {/* 가운데: 타이틀 */}
                <div className="mx-auto text-xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  키싱유 - 키워드로 노래 부르기!
                </div>
                {/* 오른쪽: 라운드 */}
                <div className="flex-shrink-0 text-lg font-semibold text-gray-800">
                  라운드 {round}/{maxRound}
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* 메인 영역: 게임(3) : 점수판(1) */}
        <div className="flex-1 w-full max-w-6xl mx-auto flex flex-row gap-4 px-4 pb-4">
          {/* 게임 영역 */}
          <div className="flex-1 flex items-center justify-center bg-white/90 rounded-2xl min-h-[448px] mr-2">
            {/* 실제 게임 내용 */}
            <div className="w-full flex flex-col items-center justify-center">
              {renderGamePhase()}
            </div>
          </div>
          {/* 점수판 영역 */}
          <div className="w-[320px] min-w-[260px] max-w-[340px] flex flex-col">
            <Card className="bg-white/90 backdrop-blur-sm border-0 flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">🏆 점수판</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const user = users[idx];
                    const slotClass =
                      "rounded-lg border-2 flex items-center min-h-[64px] py-3 px-5 transition-all";
                    if (user) {
                      return (
                        <div
                          key={user.id}
                          className={
                            slotClass +
                            ' ' +
                            (currentPlayerNick === user.nickname
                              ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 ring-2 ring-purple-200'
                              : 'border-gray-200 bg-gray-50')
                          }
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                                {user.nickname[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{user.nickname}</span>
                                {user.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                              {scores[user.nickname] || 0}점
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div
                          key={"empty-" + idx}
                          className={slotClass + " border-gray-200 bg-gray-100 justify-center text-gray-400 select-none"}
                        >
                          <span className="text-base font-semibold">빈 슬롯</span>
                        </div>
                      );
                    }
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 하단 채팅창 */}
        <div className="w-full max-w-6xl mx-auto px-4 pb-8">
          <div className="bg-white/80 rounded-2xl p-4 max-h-[300px] overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <KeysingyouChatBox
                user={user}
                messages={chatMsgs.map((c, i) => ({
                  id: i,
                  type: 'TALK',
                  roomId: room.roomId,
                  senderId: '',
                  senderName: c.message.split(":")[0],
                  message: c.message.split(":").slice(1).join(":"),
                  timestamp: '',
                  time: '',
                }))}
                onSend={sendChat}
                autoScrollToBottom={true}
                chatType="game"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default KeysingyouGameRoom;
