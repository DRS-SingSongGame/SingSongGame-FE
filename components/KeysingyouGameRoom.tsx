import { Key, useEffect, useRef, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Mic, Crown, Play, CheckCircle, Circle, LogOut, Trophy, ArrowLeft } from "lucide-react";
import { getSocket, disconnectSocket } from "@/lib/keysingyouWebSocket";
import { CardContent } from "./ui/Card";
import { CardTitle } from "./ui/Card";
import { CardHeader } from "./ui/Card";
import { Card } from "./ui/Card";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import ChatBox from "@/components/chat/ChatBox";
import api from "@/lib/api";
import RandomSongGame from "./RandomSongGame";
import { Button } from "./ui/Button";
import { Badge } from "./ui/badge";
import { sendGameMessage } from "@/lib/gameSocket";
import KeysingyouPlayerSlots from "@/components/ui/KeysingyouPlayerSlots";
import { TimerCircle } from "./ui/TimerCircle";
import { Progress } from "./ui/Progress";

interface GameRoomProps {
  user: any;
  room: any;
  onBack: () => void;
}

interface User {
  id: number;
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
  const [scores, setScores] = useState<Record<string, number>>({});
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

    /* ① 전체 게임 인트로 10s */
    sock.on("game_intro", () => {
      setScores({});
      setPhase("intro");
      setTimer(10);
    });

    /* ② 키워드 공개 5s */
    sock.on(
      "keyword_phase",
      (d: { playerSid: string; playerNick: string; keyword: Keyword }) => {
        setKeyword(d.keyword);
        keywordRef.current = d.keyword;
        setCurrentSid(d.playerSid);
        setCurrentPlayerNick(d.playerNick);
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
      setScores(prev => ({
        ...prev,
        [currentPlayerNick]: (prev[currentPlayerNick] ?? 0) + data.score   // ⓒ 가산
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
        setFinalScores(d.scores.sort((a,b)=>b.score-a.score));
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

  const handleSendMessage = (message: string) => {
    console.log("[상위 컴포넌트] 보내는 메시지:", message);
    if (message.trim()) {
      sendGameMessage(room.roomId, user.id, user.nickname, message.trim());
    }
  };

  const handleLeaveRoom = async () => {
    // TODO: 백엔드에 방 나가기 요청 (HTTP)
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
    handleLeaveRoom();
    router.push(`/lobby`);
  }

  const renderGamePhase = () => {
    switch (phase) {
      case 'ready':
        return (
                <div className="min-h-[100vh] h-[800px] p-4 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
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
                  <Card className="bg-white/90 backdrop-blur-sm flex-1 flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-pink-700">채팅</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1">
                      <section
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          height: "384px",
                        }}
                      >
                        <div
                          id="room-chat-box"
                          style={{
                            flex: 1,
                            overflowY: "auto",
                            background: "#f9fafb",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            padding: "12px",
                            whiteSpace: "pre-line",
                          }}
                        >
                          {chatMsgs.length === 0 ? (
                            <p className="text-gray-500 italic">채팅이 없습니다.</p>
                          ) : (
                            chatMsgs.map((c, i) => (
                              <p
                                key={i}
                                style={{
                                  marginBottom: "8px",
                                  wordBreak: "break-word",
                                }}
                              >
                                {c.message}
                              </p>
                            ))
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendChat()}
                            placeholder="메시지 입력"
                            style={{
                              flex: 1,
                              padding: "8px",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                            }}
                          />
                          <button
                            onClick={sendChat}
                            style={{
                              padding: "8px 16px",
                              background: "#1d4ed8",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            전송
                          </button>
                        </div>
                      </section>
                    </CardContent>
                  </Card>
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
                            socket.current?.emit("start_game", { roomId })
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
          <div className="text-center space-y-8">
            <div className="text-6xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent animate-bounce">
              🎤
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-900">게임 시작!</h2>
              <p className="text-xl text-gray-600">키워드 노래 게임이 곧 시작됩니다</p>
            </div>
            <TimerCircle timeLeft={timer} duration={timer} size={100} />
          </div>
        );
        
      case 'keyword':
        return (
          <div className="text-center space-y-8">
            <div className="bg-red-500 text-white rounded-lg p-8 transform hover:scale-105 transition-all shadow-xl">
              <h2 className="text-4xl font-bold mb-2">키워드</h2>
              <div className="text-6xl font-bold">{keyword?.name}</div>
            </div>
            <p className="text-xl text-gray-700">
              <span className="font-bold text-blue-600">{users.find((u) => u.sid === currentSid)?.nickname}</span> 님의 차례입니다
            </p>
            <TimerCircle timeLeft={timer} duration={timer} size={100} />
          </div>
        );
        
      case 'record':
        return (
          <div className="text-center space-y-8">
            <div className="bg-red-500 text-white rounded-lg p-4 inline-block">
              <h2 className="text-2xl font-bold">키워드: {keyword?.name}</h2>
            </div>
            
            <div className="space-y-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center animate-pulse">
                  <Mic className="w-16 h-16 text-white" />
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-red-500 text-white">녹음 중</Badge>
                </div>
              </div>
              
              <div className="space-y-4">
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
            <div className="bg-blue-500 text-white rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-2">🎵 재생 중</h2>
              <p className="text-xl">{users.find((u) => u.sid === currentSid)?.nickname} 님의 음성 분석중..</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <audio 
                src="#" 
                autoPlay 
                controls 
                className="w-full mb-4"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">실시간 음성 분석</h3>
            </div>
          </div>
        );
        
      case 'result':
        if (!matchedResult) return null;

        const { matched, title, artist, score } = matchedResult;
        const passed     = matched;
        const badgeColor = passed
          ? 'bg-gradient-to-r from-green-400 to-emerald-500'
          : 'bg-gradient-to-r from-red-400 to-pink-500';
        const textColor  = passed
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent'
          : 'bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent';
        
        return (
          <div className="text-center space-y-8">
            {/* ✔ / ✖ 아이콘 */}
            <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center ${badgeColor}`}>
              <span className="text-6xl">{passed ? '✅' : '❌'}</span>
            </div>

            {/* 결과 텍스트 */}
            <div className="space-y-4">
              <h3 className={`text-2xl font-bold ${textColor}`}>
                {passed ? `정답! +${score}점` : `아쉬워요! ${score}점`}
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
              duration={timer}
              size={80}
            />
          </div>
        );
        
      case 'final':
        const rankings = [
          { player: 'TestPlayer', score: 85, rank: 1 },
          { player: 'Player2', score: 72, rank: 2 },
          { player: 'Player3', score: 68, rank: 3 }
        ];
        
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="bg-yellow-500 text-white rounded-lg p-6 inline-block">
                <Trophy className="w-12 h-12 mx-auto mb-2" />
                <h1 className="text-3xl font-bold">🏆 최종 결과</h1>
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {rankings.map((ranking, index) => (
                <div
                  key={ranking.player}
                  className={`flex items-center justify-between p-4 rounded-xl shadow-sm border ${
                    index === 0
                      ? 'bg-yellow-50 border-yellow-200'
                      : index === 1
                      ? 'bg-gray-50 border-gray-200'
                      : index === 2
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      index === 0
                        ? 'bg-yellow-500 text-white'
                        : index === 1
                        ? 'bg-gray-400 text-white'
                        : index === 2
                        ? 'bg-orange-400 text-white'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                      {ranking.rank}
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {ranking.player}
                    </span>
                  </div>
                  
                  <div className="text-xl font-bold text-gray-900">
                    {ranking.score}점
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button
                onClick={onBack}
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
    return renderGamePhase();
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-pink-400 via-purple-500 via-blue-500 to-cyan-400">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <Button variant="outline" onClick={onBack} className="mb-4 bg-white/90">
            <ArrowLeft className="w-4 h-4 mr-2" />
            게임 나가기
          </Button>
          
          <Card className="bg-white/90 backdrop-blur-sm border-0">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  키싱유 - 키워드로 노래 부르기!
                </CardTitle>
                <div className="text-right">
                  {/* 추후 최대 라운드에 맞게 수정할 것 */}
                  <div className="text-lg font-semibold">라운드 1/1</div>
                </div>
              </div>
              
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 게임 진행 영역 */}
          <div className="lg:col-span-2">
            <Card className="bg-white/90 backdrop-blur-sm min-h-[600px] border-0">
              <CardContent className="p-8 h-full flex flex-col justify-center items-center">
                {renderGamePhase()}
              </CardContent>
            </Card>
          </div>

          {/* 플레이어 점수판 */}
          <div>
            <Card className="bg-white/90 backdrop-blur-sm border-0">
              <CardHeader>
                <CardTitle className="text-xl">🏆 점수판</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((user, index) => (
                    <div
                      key={user.id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentPlayerNick === user.nickname
                          ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 ring-2 ring-purple-200'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                              {user.nickname[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{user.nickname}</span>
                              {user.isHost && <Crown className="w-4 h-4 text-yellow-500" />}
                              {currentPlayerNick === user.nickname && (
                                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-xs">현재 차례</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            {scores[user.nickname] || 0}점
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 게임 규칙 */}
            <Card className="bg-white/90 backdrop-blur-sm mt-4 border-0">
              <CardHeader>
                <CardTitle className="text-lg">📋 게임 규칙</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>• 주어진 키워드가 들어간 노래를 불러주세요</p>
                  <p>• 10초간 녹음되며, AI가 채점합니다</p>
                  <p>• 성공 시 점수 획득, 실패 시 -10점</p>
                  <p>• 성공하면 다음 사람, 실패하면 다시 도전</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Chat Component */}
    </div>
  );
};
export default KeysingyouGameRoom;
