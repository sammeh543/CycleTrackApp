import React from "react";
import { Droplet } from "lucide-react";

// Wrapper for the Lucide Droplet icon, to allow easy theming or swapping in the future
const DropletIcon: React.FC<{ className?: string; fill?: string; fillOpacity?: number }> = ({ className, fill, fillOpacity, ...props }) => (
  <Droplet className={className} fill={fill} fillOpacity={fillOpacity} {...props} />
);

export default DropletIcon;
