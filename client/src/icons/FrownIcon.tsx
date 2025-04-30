import React from "react";
import { Frown } from "lucide-react";

const FrownIcon: React.FC<{ className?: string }> = ({ className, ...props }) => (
  <Frown className={className} {...props} />
);

export default FrownIcon;
