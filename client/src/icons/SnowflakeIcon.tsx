import React from "react";
import { Snowflake } from "lucide-react";

const SnowflakeIcon: React.FC<{ className?: string; fill?: string; fillOpacity?: number }> = ({ className, fill, fillOpacity, ...props }) => (
  <Snowflake className={className} fill={fill} fillOpacity={fillOpacity} {...props} />
);

export default SnowflakeIcon;
