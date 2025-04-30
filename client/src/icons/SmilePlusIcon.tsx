import React from "react";
import { SmilePlus } from "lucide-react";

const SmilePlusIcon: React.FC<{ className?: string }> = ({ className, ...props }) => (
  <SmilePlus className={className} {...props} />
);

export default SmilePlusIcon;
