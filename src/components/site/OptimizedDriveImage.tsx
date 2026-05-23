import { cn } from "../../lib/utils";
import { driveDisplayUrl, type DriveImageSize } from "../../lib/driveImageUrl";

interface OptimizedDriveImageProps {
  src: string;
  alt?: string;
  className?: string;
  size?: DriveImageSize;
  priority?: boolean;
  "aria-hidden"?: boolean | "true" | "false";
}

export default function OptimizedDriveImage({
  src,
  size = "md",
  priority = false,
  className,
  alt = "",
  ...props
}: OptimizedDriveImageProps) {
  const optimizedSrc = driveDisplayUrl(src, size);

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      className={cn(className)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      {...props}
    />
  );
}
