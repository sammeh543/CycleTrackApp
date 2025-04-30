import React from "react";
import { Cloud } from "lucide-react";

const CloudIcon: React.FC<{ className?: string; fill?: string; fillOpacity?: number }> = ({ className, fill, fillOpacity, ...props }) => (
  <Cloud className={className} fill={fill} fillOpacity={fillOpacity} {...props} />
);

export default CloudIcon;
