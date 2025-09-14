import { FocusedLayout } from '@/components/layout/focused-layout';

export default function SimuladoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <FocusedLayout>{children}</FocusedLayout>;
}
