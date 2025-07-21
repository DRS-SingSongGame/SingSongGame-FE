import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Mic, Crown, Play, Circle, LogOut, Trophy, ArrowLeft, X, ChevronLeft, ChevronRight, HelpCircle, MicOff } from "lucide-react";
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
import { TimerCircle } from "./ui/TimerCircle";
import { Progress } from "./ui/Progress";
import AudioVisualizer from "./ui/AudioVisualizer";
import { getSharedAudioCtx } from "@/lib/sharedAudioCtx";
import { attachEcho } from "@/lib/applyEcho";

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
  msgType: string;
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
    image: string | null;
  } | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState<"분석중" | "추출중" | "대조중">("분석중");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [finalScores, setFinalScores] = useState<
    | {
      nickname: string;
      score: number;
    }[]
    | null
  >(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const images = ["/score_guide1.jpg", "/score_guide2.jpg"];
  // 1. 상태 추가
  const [rollingKeyword, setRollingKeyword] = useState<string>("");
  // 1. 후보 키워드 배열 및 상태 추가
  const candidates = [
    "아이유", "빅뱅", "지코", "에스파", "뉴진스", "BTS", "IVE", "세븐틴", "블랙핑크", "레드벨벳",
    // 유명한 곡 제목 추가
    "좋은날", "거짓말", "아무노래", "Next Level", "Hype Boy", "Dynamite", "LOVE DIVE", "HOT", "Kill This Love", "Psycho"
  ];
  const [rollingIndex, setRollingIndex] = useState(0);
  const [rollingSpeed, setRollingSpeed] = useState(30);
  const [showFinal, setShowFinal] = useState(false);

  // 1. 상태 및 ref 추가
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const isBlockingRef = useRef(true);

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
    const iv = setInterval(() => setTimer((t) => (t <= 0.1 ? 0 : +(t - 0.1).toFixed(1))), 100);
    return () => clearInterval(iv);
  }, [timer]);

  useEffect(() => {
    if (roomChatBoxRef.current) {
      roomChatBoxRef.current.scrollTop = roomChatBoxRef.current.scrollHeight;
    }
  }, [chatMsgs]);

  useEffect(() => {
    if (!audioSrc || !audioRef.current) return;

    const audioEl = audioRef.current;

    const onReady = async () => {
      try {
        await getSharedAudioCtx().resume();
        await audioEl.play();
      } catch (err) {
        console.warn("Autoplay 실패:", err);
      }
    };

    audioEl.addEventListener("canplaythrough", onReady, { once: true });
    audioEl.load();

    return () => audioEl.removeEventListener("canplaythrough", onReady);
  }, [audioSrc]);


  useEffect(() => {
    if (phase !== "listen") return;

    setAnalysisStep("분석중");
    const timer1 = setTimeout(() => setAnalysisStep("대조중"), 4000);
    const timer2 = setTimeout(() => setAnalysisStep("추출중"), 7000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [phase, audioSrc]);

  useEffect(() => {
    if (phase !== "listen" || !audioRef.current) return;

    getSharedAudioCtx().resume().catch(() => { });
    attachEcho(audioRef.current);
  }, [phase]);

  // 2. 키워드 phase 진입 시 슬롯머신 애니메이션
  useEffect(() => {
    if (phase === "keyword" && keyword) {
      // 키워드 룰렛 시작 시 사운드 재생
      const keywordAudio = new Audio('/audio/keyword.wav');
      keywordAudio.play().catch(error => {
        console.log('키워드 사운드 재생 실패:', error);
      });

      setShowFinal(false);
      setRollingSpeed(20);
      let idx = 0;
      let interval: NodeJS.Timeout;
      let timeout1: NodeJS.Timeout;


      // 1. 3초간 빠르게 돌기
      const fastRoll = () => {
        setRollingIndex(idx % candidates.length);
        idx++;
        interval = setTimeout(fastRoll, 20);
      };
      fastRoll();

      // 2. 3초 후 멈추고 실제 키워드 보여주기
      timeout1 = setTimeout(() => {
        clearTimeout(interval);
        setShowFinal(true);
      }, 3000);

      return () => {
        clearTimeout(interval);
        clearTimeout(timeout1);
      };
    }
  }, [phase, keyword]);

  // result 페이즈에서 정답 여부에 따른 사운드 재생
  useEffect(() => {
    if (phase === "result" && matchedResult) {
      const { matched } = matchedResult;

      if (matched) {
        // 정답일 때: clap.mp3와 wow.wav 동시 재생
        const clapAudio = new Audio('/audio/clap.mp3');
        const wowAudio = new Audio('/audio/wow.wav');

        clapAudio.play().catch(error => {
          console.log('박수 사운드 재생 실패:', error);
        });

        wowAudio.play().catch(error => {
          console.log('와우 사운드 재생 실패:', error);
        });
      } else {
        // 틀렸을 때: fail.mp3 재생
        const failAudio = new Audio('/audio/fail.mp3');
        failAudio.play().catch(error => {
          console.log('실패 사운드 재생 실패:', error);
        });
      }
    }
  }, [phase, matchedResult]);

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

      // intro 페이즈 시작 시 intro.mp3 재생
      const introAudio = new Audio('/audio/intro.mp3');
      introAudio.volume = 0.3; // 음량을 30%로 설정
      introAudio.play().catch(error => {
        console.log('인트로 사운드 재생 실패:', error);
      });
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
        setTimer(8);
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

    sock.on(
      "listen_phase",
      (d: { playerSid: string; audio: string; mime?: string }) => {
        setPhase("listen");

        const mime = d.mime ?? "audio/webm";
        const src = `data:${mime};base64,${d.audio}`;
        setAudioSrc(src);

        setCurrentSid(d.playerSid);
      }
    );

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

        // final 페이즈 시작 시 final.wav 재생
        const finalAudio = new Audio('/audio/final.wav');
        finalAudio.volume = 1.0; // 음량을 100%로 설정
        finalAudio.play().catch(error => {
          console.log('파이널 사운드 재생 실패:', error);
        });
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

  // 2. 뒤로가기/새로고침 차단 useEffect
  useEffect(() => {
    isBlockingRef.current = true;

    const handlePopState = (e: PopStateEvent) => {
      if (!isBlockingRef.current) return;
      setTimeout(() => {
        window.history.pushState(null, '', window.location.href);
      }, 0);
      setShowLeaveConfirmModal(true);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isBlockingRef.current) return;
      e.preventDefault();
      e.returnValue = '게임이 진행 중입니다. 정말로 나가시겠습니까?';
      return '게임이 진행 중입니다. 정말로 나가시겠습니까?';
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      isBlockingRef.current = false;
    };
  }, []);

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

  // 3. 나가기 버튼 핸들러 변경
  const handleLeaveRoomClick = () => {
    setShowLeaveConfirmModal(true);
  };

  // 4. 모달 내 버튼 핸들러
  const handleConfirmLeave = () => {
    isBlockingRef.current = false;
    setShowLeaveConfirmModal(false);
    setTimeout(() => {
      handleLeaveRoom(); // 기존 나가기 로직 호출
    }, 100);
  };

  const handleStayInGame = () => {
    setShowLeaveConfirmModal(false);
    setTimeout(() => {
      if (isBlockingRef.current) {
        window.history.pushState(null, '', window.location.href);
      }
    }, 100);
  };

  // 5. renderLeaveConfirmModal 함수 추가
  const renderLeaveConfirmModal = () => (
    showLeaveConfirmModal && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              게임을 나가시겠습니까?
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              게임이 진행 중입니다.<br />
              나가시면 게임에서 제외되며 점수가 저장되지 않습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleStayInGame}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                계속 게임하기
              </button>
              <button
                onClick={handleConfirmLeave}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

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
      msgType: "chat",
    });
    setChatInput("");
  }

  /* ───── 나가기 ───── */
  function leaveRoom() {
    socket.current?.emit("leave_room");
    handleLeaveRoom();
    router.push(`/lobby`);
  }

  // 게임 시작 핸들러 추가 (랜덤송과 동일하게 API 호출)
  const handleStartGame = async () => {
    try {
      // room 상태를 play로 바꾸는 API 호출 (키워드 없음)
      await api.post(`/api/game-session/${room.roomId}/start`, {
        keywords: [],
      });
    } catch (e) {
      // 실패해도 일단 진행
      console.error('room 상태 play 전환 API 실패', e);
    }
    // 기존 소켓 emit
    socket.current?.emit("start_game", {
      roomId,
      maxRounds: room.maxRound,
    });
  };

  const renderGamePhase = () => {
    switch (phase) {
      case 'ready':
        return (
          <div className="min-h-[800px] h-[800px] p-4">
            {isModalOpen && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
                <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-7xl w-full flex flex-col items-center">
                  <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-black"
                    onClick={() => setIsModalOpen(false)}
                    type="button"
                  >
                    <X className="w-7 h-7" />
                  </button>
                  <img src={images[imgIdx]} alt="채점 기준" className="max-h-[75vh] rounded-xl" />
                  <div className="flex justify-between w-full mt-4">
                    <button
                      onClick={() => setImgIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                      className="p-2"
                      type="button"
                    >
                      <ChevronLeft className="w-7 h-7" />
                    </button>
                    <button
                      onClick={() => setImgIdx((prev) => (prev + 1) % images.length)}
                      className="p-2"
                      type="button"
                    >
                      <ChevronRight className="w-7 h-7" />
                    </button>
                  </div>
                  {/* 페이지 표시 */}
                  <div className="mt-2 text-gray-500 text-sm font-semibold">{imgIdx + 1} / {images.length}</div>
                </div>
              </div>
            )}
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
                    <CardContent className="py-12">
                      <div className="grid grid-cols-2 gap-4">
                        {Array.from({ length: room.maxPlayer }).map((_, idx) => {
                          const user = users[idx];
                          if (user) {
                            return (
                              <div
                                key={user.id}
                                className="rounded-xl border-2 border-blue-400 bg-white/90 shadow-md flex items-center gap-4 p-4 transition-all h-24 w-full"
                              >
                                <Avatar className="w-12 h-12 flex-shrink-0">
                                  <AvatarImage src={user.avatar} />
                                  <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                                    {user.nickname[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-lg text-gray-900 truncate">{user.nickname}</span>
                                    {user.isHost && <span>👑</span>}
                                    {user.mic ? <Mic className="text-green-500 w-5 h-5" /> : <MicOff className="text-red-500 w-5 h-5" />}
                                  </div>
                                  <div className={
                                    "text-sm " +
                                    (user.isHost
                                      ? "text-gray-500"
                                      : user.ready
                                        ? "text-green-600 font-bold"
                                        : "text-gray-500")
                                  }>
                                    {user.isHost
                                      ? "방장"
                                      : user.ready
                                        ? "준비 완료"
                                        : "대기 중"}
                                  </div>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div
                                key={"empty-" + idx}
                                className="rounded-xl border-2 border-blue-200 bg-white/40 shadow-md flex items-center justify-center p-4 opacity-60 border-dashed h-24 w-full"
                              >
                                <span className="text-base font-semibold text-gray-400 select-none">빈 슬롯</span>
                              </div>
                            );
                          }
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 채팅 */}
                  <div className="bg-white rounded-2xl flex flex-col w-full min-h-[300px] p-6">
                    {/* 상단 제목 */}

                    {/* 채팅 메시지 영역 */}
                    <div className="flex-1 mb-4">
                      <div ref={roomChatBoxRef} className="flex flex-col justify-end h-[200px] min-h-[200px] max-h-[200px] overflow-y-auto scrollbar-hide bg-[#fafbfc] rounded-xl px-4 py-2 border border-[#f0f0f0]">
                        {chatMsgs.length === 0 ? (
                          <div className="text-gray-300 text-base text-center my-auto select-none">&nbsp;</div>
                        ) : (
                          chatMsgs.map((c, i) => {
                            if (c.msgType === 'chat') {
                              const [who, ...body] = c.message.split(':');
                              return (
                                <div key={i} className="flex items-center text-base py-0.5">
                                  <span className="font-bold mr-1">{who}:</span>
                                  <span className="whitespace-pre-line break-all">{body.join(':')}</span>
                                </div>
                              );
                            } else {
                              /* join / leave → 시스템 메시지 */
                              return (
                                <div key={i} className="text-center text-sm italic text-gray-500 py-0.5">
                                  {c.message}
                                </div>
                              );
                            }
                          })
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
                        className="flex-1 min-w-0 rounded-xl border-2 border-blue-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white/80 text-gray-700 shadow-md"
                        style={{ boxShadow: 'none' }}
                      />
                      <button
                        onClick={() => sendChat(chatInput)}
                        className="rounded-xl bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white font-bold text-base px-8 py-3 transition-colors shadow-xl border-2 border-blue-300"
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
                      <CardContent className="space-y-2 flex-1 text-xl">
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
                        <div>
                          <span className="font-medium">최대 라운드:</span>{" "}
                          <span>{room.maxRound}</span>
                        </div>
                      </CardContent>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex flex-col gap-2 p-4">
                      {/* 마이크 허용 버튼 위에 도움말 버튼 */}
                      <div className="flex items-center justify-between mb-2">
                        {/* 도움말 버튼 */}
                        <button
                          className="flex items-center gap-1 text-gray-500 font-bold hover:text-gray-700 transition-colors text-lg"
                          onClick={() => setIsModalOpen(true)}
                          type="button"
                        >
                          <HelpCircle className="w-5 h-5" />
                          채점 기준
                        </button>
                      </div>
                      {/* 기존 마이크 허용 버튼 아래에 그대로 */}
                      <Button
                        onClick={requestMicPermission}
                        className="w-full bg-gradient-to-br from-green-600 via-green-500 to-green-400 hover:from-green-700 hover:to-green-500 text-white font-extrabold h-[54px] text-xl shadow-2xl border-2 border-green-300 rounded-2xl transition-all duration-150"
                      >
                        <Mic className="mr-2 h-5 w-5" /> 마이크 허용
                      </Button>
                      {isHost ? (
                        <Button
                          disabled={!users.every((u) => u.ready && u.mic) || users.length < 1}
                          onClick={handleStartGame}
                          className="w-full h-[54px] text-xl font-extrabold shadow-2xl border-2 rounded-2xl transition-all duration-150
                            bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 hover:from-blue-800 hover:to-cyan-600 text-white">
                          <Play className="w-5 h-5 mr-2" /> 게임 시작
                        </Button>
                      ) : (
                        <Button
                          onClick={() => socket.current?.emit("toggle_ready", { roomId })}
                          className="w-full h-[54px] text-xl bg-gradient-to-br from-green-700 via-green-600 to-green-400 hover:from-green-800 hover:to-green-500 text-white font-extrabold shadow-2xl border-2 border-green-300 rounded-2xl transition-all duration-150"
                        >
                          <Circle className="w-5 h-5 mr-2" /> 준비하기
                        </Button>
                      )}

                      <Button
                        className="w-full h-[54px] bg-gradient-to-br from-red-700 via-red-600 to-red-400 hover:from-red-800 hover:to-red-500 text-white text-xl font-extrabold shadow-2xl border-2 border-red-300 rounded-2xl transition-all duration-150"
                        onClick={leaveRoom}
                      >
                        <LogOut className="w-5 h-5 mr-2" /> 나가기
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
              <h2 className="text-4xl font-bold text-gray-900">키싱유 게임 시작!</h2>
              <p className="text-2xl text-gray-600">
                주어진 키워드가 들어간 노래를 <span className="font-bold text-pink-600">10초</span> 동안 불러주세요!
                <br /><br />음정, 박자를 맞추면 더 높은 점수를 얻을 수 있어요!
              </p>
            </div>
            <div className="mt-8">
              <TimerCircle timeLeft={Math.ceil(timer)} duration={10} size={80} />
            </div>
          </div>
        );

      case 'keyword':
        return (
          <div className="text-center space-y-8">
            <div className="bg-green-500 text-white rounded-lg p-8 transform hover:scale-105 transition-all shadow-xl w-auto inline-block">
              <h2 className="text-4xl font-bold mb-2">{keyword?.type}</h2>
              <div className="relative overflow-hidden flex items-center justify-center" style={{
                height: '5rem',
                width: 'auto',
                minWidth: '12rem',
                maxWidth: '32rem'
              }}>
                {!showFinal ? (
                  <div
                    className="transition-transform duration-100"
                    style={{
                      transform: `translateY(-${rollingIndex * 3}rem)`,
                      willChange: "transform"
                    }}
                  >
                    {candidates.concat(candidates).map((name, i) => (
                      <div key={i} className="text-4xl font-bold h-20 flex items-center justify-center px-4 whitespace-nowrap">{name}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-5xl font-bold text-yellow-200 drop-shadow-lg transition-all duration-500 px-4 whitespace-nowrap">{keyword?.name}</div>
                )}
              </div>
            </div>
            <p className="text-2xl text-gray-700">
              <span className="font-bold text-blue-600">{users.find((u) => u.sid === currentSid)?.nickname}</span> 님의 차례입니다
              {currentSid === mySid.current && (
                <span className="ml-2 text-green-600 font-bold">(내 차례)</span>
              )}
            </p>
            <TimerCircle timeLeft={Math.ceil(timer)} duration={8} size={80} />
          </div>
        );

      case 'record':
        // 현재 턴이 내 턴이 아닐 때 분기 렌더링
        if (mySid.current !== currentSid) {
          return (
            <div className="flex flex-col justify-center items-center min-h-[500px] h-full">
              {/* 키워드 박스 - keyword 페이즈와 동일한 스타일 */}
              <div className="text-center space-y-8 mb-8">
                <div className="bg-green-500 text-white rounded-lg p-8 transform hover:scale-105 transition-all shadow-xl w-auto inline-block">
                  <h2 className="text-4xl font-bold mb-2">{keyword?.type}</h2>
                  <div className="relative overflow-hidden flex items-center justify-center" style={{
                    height: '5rem',
                    width: 'auto',
                    minWidth: '12rem',
                    maxWidth: '32rem'
                  }}>
                    <div className="text-5xl font-bold text-yellow-200 drop-shadow-lg transition-all duration-500 px-4 whitespace-nowrap">{keyword?.name}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-6 flex flex-col items-center">
                <div className="text-2xl font-semibold text-gray-800 mb-4">
                  <span className="font-bold text-blue-600">{users.find((u) => u.sid === currentSid)?.nickname}</span>님이 녹음 중입니다.
                </div>
                <TimerCircle timeLeft={Math.ceil(timer)} duration={10} size={80} />
              </div>
            </div>
          );
        }
        // 내 턴일 때 기존 UI
        return (
          <div className="flex flex-col justify-center items-center min-h-[500px] h-full">
            {/* 키워드 박스 - keyword 페이즈와 동일한 스타일 */}
            <div className="text-center space-y-8 mb-8">
              <div className="bg-green-500 text-white rounded-lg p-8 transform hover:scale-105 transition-all shadow-xl w-auto inline-block">
                <h2 className="text-4xl font-bold mb-2">{keyword?.type}</h2>
                <div className="relative overflow-hidden flex items-center justify-center" style={{
                  height: '5rem',
                  width: 'auto',
                  minWidth: '12rem',
                  maxWidth: '32rem'
                }}>
                  <div className="text-5xl font-bold text-yellow-200 drop-shadow-lg transition-all duration-500 px-4 whitespace-nowrap">{keyword?.name}</div>
                </div>
              </div>
            </div>
            <div className="space-y-6 flex flex-col items-center">
              <div className="relative flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center animate-pulse">
                  <Mic className="w-10 h-10 text-white" />
                </div>
                <div className="mt-3">
                  <Badge className="bg-red-500 text-white">녹음 중</Badge>
                </div>
              </div>
              <div className="space-y-4 flex flex-col items-center">
                <div className="text-3xl font-bold text-red-600">
                  {Math.ceil(timer)}초 남음
                </div>
                <Progress value={((10 - timer) / 10) * 100} className="w-64 mx-auto" />
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
            />
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {analysisStep === "분석중" ? (
                  <>
                    녹음된 <span className="text-blue-600 font-bold">음성 파형</span>을 분석하고 있습니다..
                  </>
                ) : analysisStep === "대조중" ? (
                  <>
                    <span className="text-green-600 font-bold">실제 음원의 파형</span>과 대조 중입니다..
                  </>
                ) : (
                  <>
                    <span className="text-red-600 font-bold">추출된 가사</span>를 분석하고 있습니다..
                  </>
                )}
              </h3>
              <AudioVisualizer audioRef={audioRef} />
            </div>
          </div>
        );

      case 'result':
        if (!matchedResult) return null;

        const { matched, title, artist, score, image } = matchedResult;
        const passed = matched;
        const badgeColor = passed
          ? 'bg-gradient-to-r from-green-400 to-emerald-500'
          : 'bg-gradient-to-r from-red-400 to-pink-500';
        const textColor = passed
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent'
          : 'bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent';

        // 게임 영역 배경 어둡게(비 내릴 때만)
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* 배경: 맞췄을 때는 기존과 동일하게 bg-white/90, 틀렸을 때는 bg-gray-100 */}
            <div className={`absolute inset-0 z-0 rounded-2xl pointer-events-none ${passed ? "bg-white/90" : "bg-gray-100"}`} />
            {/* 결과 카드 등 기존 내용 */}
            <div className={`text-center space-y-8 relative ${!passed ? 'rain-effect' : ''} bg-transparent mx-auto w-full h-full flex flex-col justify-center items-center p-10 z-10`}>
              {/* 실패 시 비 효과 */}
              {!passed && (
                <>
                  <div className="rain-container absolute inset-0 overflow-hidden rounded-lg">
                    {[...Array(50)].map((_, i) => (
                      <div
                        key={i}
                        className="rain-drop absolute bg-blue-300 w-0.5 h-8 animate-rain"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `-${50 + Math.random() * 150}px`,
                          animationDelay: `${Math.random() * 2}s`,
                          animationDuration: `${0.5 + Math.random() * 0.5}s`
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* ✔ / ✖ 아이콘 또는 앨범 이미지 */}
              {passed && image ? (
                <div className="mx-auto mb-4 w-40 h-40 rounded-xl overflow-hidden flex items-center justify-center bg-neutral-200 shadow-lg relative z-10">
                  <img src={image} alt="앨범 이미지" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${badgeColor} overflow-hidden relative z-10`}>
                  <span className="text-6xl">{passed ? '✅' : '❌'}</span>
                </div>
              )}

              {/* 결과 텍스트 */}
              <div className="space-y-4 relative z-10">
                <h3 className={`text-2xl font-bold ${textColor}`}>
                  {passed
                    ? `정답! +${score}점`
                    : `아쉬워요! 다음 기회에!`}
                </h3>

                {/* 성공일 때만 노래 정보 보여주기 */}
                {passed && title && artist && (
                  <div className="flex items-center justify-center mt-2">
                    <span className="mr-2 text-2xl font-bold text-purple-500">🎵</span>
                    <span className="text-gray-800 text-xl font-bold">{title} - {artist}</span>
                  </div>
                )}
              </div>

              {/* 원형 타이머 */}
              <TimerCircle
                timeLeft={Math.ceil(timer)}
                duration={5}
                size={80}
              />
            </div>
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
          {renderLeaveConfirmModal()}
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
              <div className="h-full flex items-center justify-between w-full relative">
                {/* 왼쪽: 게임 나가기 버튼 */}
                <div className="flex-shrink-0">
                  <Button
                    variant="outline"
                    onClick={handleLeaveRoomClick}
                    className="bg-white/90 flex-shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    게임 나가기
                  </Button>
                </div>
                {/* 가운데: 타이틀 */}
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl font-bold text-black whitespace-nowrap">
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
          {/* 점수판 영역 */}
          <div className="w-[180px] min-w-[140px] max-w-[220px] flex flex-col">
            <Card className="bg-white/90 backdrop-blur-sm border-0 flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl">🎤 점수 현황</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center px-2">
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const user = users[idx];
                    const slotClass =
                      "w-full rounded-lg border-2 flex items-center min-h-[64px] py-3 px-2 transition-all";
                    if (user) {
                      const isMe = user.nickname === nickname;
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
                          <div className="flex items-center justify-between flex-1">
                            <div className="relative ml-2">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                                  {user.nickname[0]}
                                </AvatarFallback>
                              </Avatar>
                              {isMe && (
                                <span
                                  className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow"
                                  style={{ fontSize: '10px', lineHeight: '14px' }}
                                >
                                  Me
                                </span>
                              )}
                            </div>
                            <div className="text-right ml-4 flex-1 mr-2">
                              <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                {(scores[user.nickname] || 0) + '점'}
                              </div>
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
          {/* 게임 영역 */}
          {phase === 'result' ? (
            // result 페이즈일 때는 카드 없이 전체 영역에 바로 렌더링
            <div className="flex-1 flex items-center rounded-2xl justify-center">
              {renderLeaveConfirmModal()}
              {renderGamePhase()}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white/90 rounded-2xl min-h-[448px]">
              {/* 실제 게임 내용 */}
              <div className="w-full flex flex-col items-center justify-center">
                {renderLeaveConfirmModal()}
                {renderGamePhase()}
              </div>
            </div>
          )}
        </div>

        {/* 하단 채팅창 */}
        <div className="w-full max-w-6xl mx-auto px-4 pb-8">
          <div className="bg-white/80 rounded-2xl p-4 max-h-[300px] overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <KeysingyouChatBox
                user={user}
                messages={chatMsgs.map((c, i) => {
                  if (c.msgType === "chat") {
                    const [who, ...body] = c.message.split(":");
                    return {
                      id: i,
                      type: "TALK",
                      roomId: room.roomId,
                      senderId: "",
                      senderName: who ?? "",
                      message: body.join(":").trim(), // 내용
                      timestamp: "",
                      time: "",
                    };
                  }

                  // join / leave / 기타 시스템 알림
                  return {
                    id: i,
                    type: "SYSTEM",
                    roomId: room.roomId,
                    senderId: "",
                    senderName: "",            // 필요 없으므로 빈값
                    message: c.message,        // 전체 문장을 그대로 넘긴다
                    timestamp: "",
                    time: "",
                  };
                })}
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
