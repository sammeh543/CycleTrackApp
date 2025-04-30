import React from "react";
import { Waves } from "lucide-react";

const WavesIcon: React.FC<{ className?: string; fill?: string; fillOpacity?: number }> = ({ className, fill, fillOpacity, ...props }) => (
  <Waves className={className} fill={fill} fillOpacity={fillOpacity} {...props} />
);

export default WavesIcon;
