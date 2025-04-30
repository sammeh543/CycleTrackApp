import React from "react";
import { Smile } from "lucide-react";

const SmileIcon: React.FC<{ className?: string }> = ({ className, ...props }) => (
  <Smile className={className} {...props} />
);

export default SmileIcon;
