import React from "react";
import { TbHeartBolt } from "react-icons/tb";

export const IntimateIcon: React.FC<{ className?: string }> = ({ className }) => (
  <TbHeartBolt className={className || "w-4 h-4"} aria-label="Intimate activity" />
);
export default IntimateIcon;
