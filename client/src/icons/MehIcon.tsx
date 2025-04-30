import React from "react";
import { Meh } from "lucide-react";

const MehIcon: React.FC<{ className?: string }> = ({ className, ...props }) => (
  <Meh className={className} {...props} />
);

export default MehIcon;
