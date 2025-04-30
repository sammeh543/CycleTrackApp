import React from "react";
import { Check } from "lucide-react";

const CheckIcon: React.FC<{ className?: string }> = ({ className, ...props }) => (
  <Check className={className} {...props} />
);

export default CheckIcon;
