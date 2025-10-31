import React from "react";
import { X, ChevronDown, MoreVertical } from "lucide-react";

const HeaderBar = ({ title, onClose }) => {
  return (
    <div className="bg-[#09113B] px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {onClose && (
          <X
            className="text-white w-5 h-5 cursor-pointer"
            onClick={onClose}
          />
        )}
        <span className="text-white font-medium">{title || "STIM App"}</span>
      </div>
      <div className="flex gap-3">
        <ChevronDown className="text-white w-5 h-5" />
        <MoreVertical className="text-white w-5 h-5" />
      </div>
    </div>
  );
};

export default HeaderBar;
