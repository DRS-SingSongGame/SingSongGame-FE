import React from "react";

interface Tag {
  id: number;
  name: string;
}

interface KeywordSelectorProps {
  tags: Tag[]; // 전체 태그 리스트
  selected: number[]; // 선택된 태그 id들
  onChange: (updated: number[]) => void;
}

const KeywordSelector: React.FC<KeywordSelectorProps> = ({ tags, selected, onChange }) => {
    const toggleTag = (id: number) => {
        const ALL_TAG_ID = 0;
      
        // 전체 선택한 경우 → 전체만 선택
        if (id === ALL_TAG_ID) {
          onChange([ALL_TAG_ID]);
          return;
        }
      
        // 전체가 이미 선택되어 있다면 해제
        let updated = selected.filter(tagId => tagId !== ALL_TAG_ID);
      
        if (updated.includes(id)) {
          // 이미 선택된 태그면 해제
          updated = updated.filter(tagId => tagId !== id);
        } else if (updated.length < 3) {
          // 3개 이하일 때만 추가
          updated = [...updated, id];
        }
      
        onChange(updated);
      };

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggleTag(tag.id)}
          className={`px-3 py-1 rounded-full border transition 
            ${
              selected.includes(tag.id)
                ? "bg-purple-600 text-white border-transparent"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
        >
          #{tag.name}
        </button>
      ))}
    </div>
  );
};

export default KeywordSelector;
