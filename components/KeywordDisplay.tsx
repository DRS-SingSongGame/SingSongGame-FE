// components/KeywordDisplay.tsx
import { useGameStore } from "@/stores/useGameStore";
import { PREDEFINED_TAGS } from "@/lib/tags";
import { Card, CardContent, CardTitle, CardHeader } from "./ui/card 2";

export default function KeywordDisplay() {
  const selectedKeywords = useGameStore((state) => state.selectedKeywords);

  return (
    <div className="w-full max-w-md mx-auto mt-6">
  <div className="bg-white/90 backdrop-blur-md border border-purple-200 rounded-lg shadow-md px-4 py-3">
    <div className="flex items-center gap-2 mb-2">
      <h2 className="text-md font-bold text-purple-700">방장이 키워드를 선택중입니다 ...</h2>
      <span className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></span>
    </div>
    <CardContent className="flex flex-wrap justify-center items-center gap-2 px-4">
        {selectedKeywords.map((id) => {
            const tag = PREDEFINED_TAGS.find((t) => t.id === id);
            return (
                <span
                    key={id}
                    className="px-4 py-2 bg-purple-100 text-purple-700 font-semibold rounded-full text-base shadow-md transition-all"
                    >
                    #{tag?.name}
                    </span>
            );
            })}
    </CardContent>
  </div>
</div>
  );
}
