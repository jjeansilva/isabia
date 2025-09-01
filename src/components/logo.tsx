import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-primary", className)}>
      <svg width="32" height="24" viewBox="0 0 33 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_101_2_logo)">
        <path d="M9.69231 0L0 6.92308V24H9.69231V0Z" fill="currentColor"/>
        <path d="M22.1538 0L12.4615 6.92308V24H22.1538V0Z" fill="currentColor" fillOpacity="0.7"/>
        <path d="M26.1538 17.0769H32.3846V24H26.1538V17.0769Z" fill="currentColor"/>
        </g>
        <defs>
        <clipPath id="clip0_101_2_logo">
        <rect width="32.3846" height="24" fill="white"/>
        </clipPath>
        </defs>
      </svg>
      <span className="text-xl font-bold font-headline">iSabIA</span>
    </div>
  );
}
