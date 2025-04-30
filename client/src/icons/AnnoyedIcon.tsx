import React from "react";
import { Annoyed } from "lucide-react";

const AnnoyedIcon: React.FC<{ className?: string }> = ({ className, ...props }) => (
  <Annoyed className={className} {...props} />
);

export default AnnoyedIcon;
