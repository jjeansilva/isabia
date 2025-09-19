import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-primary", className)}>
      <svg width="30" height="30" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.9295 1.70001C19.467 1.70001 19.033 1.81651 18.6562 2.02951L18.4913 2.12201C17.5852 2.65651 16.8923 3.32101 16.386 4.14001C15.8225 5.04601 15.5453 6.09451 15.5453 7.17151C15.5453 8.24851 15.8225 9.29701 16.386 10.203C16.8923 11.022 17.5852 11.6865 18.4913 12.221L18.6652 12.3225C19.033 12.5265 19.467 12.6435 19.9295 12.6435H24.3643C25.0483 12.6435 25.7138 12.4485 26.2958 12.0825L26.3708 12.036L30.9308 9.07351C31.5413 8.70751 31.9753 8.16451 32.1883 7.51951C32.4013 6.87451 32.3828 6.17251 32.1278 5.53651L31.5728 4.22851C31.2518 3.44551 30.6068 2.80951 29.8058 2.45851C28.9963 2.10751 28.0993 2.07451 27.2473 2.36851L26.3708 2.65651L24.3643 3.82951V1.70001H19.9295Z" fill="#00C49A"/>
        <path d="M14.9699 3.82949H9.41992V14.5095C9.41992 21.0595 12.5934 24.233 19.1434 24.233H24.3642V14.5095H19.1434C16.7117 14.5095 14.9699 12.7677 14.9699 10.336V3.82949Z" fill="#00C49A"/>
        <path d="M12.9622 32.3H1.2002V13.313L12.9622 6.38977V32.3Z" fill="url(#paint0_linear_101_5_logo)"/>
        <defs>
        <linearGradient id="paint0_linear_101_5_logo" x1="1.2002" y1="19.3449" x2="12.9622" y2="19.3449" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00C49A"/>
        <stop offset="1" stopColor="#00E1B0"/>
        </linearGradient>
        </defs>
      </svg>
      <span className="text-xl font-bold font-headline tracking-tighter text-foreground">iSab<span className="text-primary">IA</span></span>
    </div>
  );
}
