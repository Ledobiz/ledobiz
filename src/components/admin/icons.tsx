import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...props }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export const OverviewIcon = (p: Props) => (
  <Svg {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Svg>
);
export const InboxIcon = (p: Props) => (
  <Svg {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" /></Svg>
);
export const FolderIcon = (p: Props) => (
  <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Svg>
);
export const UsersIcon = (p: Props) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14a6 6 0 0 1 3.5 6" /></Svg>
);
export const WalletIcon = (p: Props) => (
  <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h14v4" /><path d="M3 7v11a2 2 0 0 0 2 2h16v-5" /><path d="M21 9h-5a3 3 0 0 0 0 6h5z" /></Svg>
);
export const SettingsIcon = (p: Props) => (
  <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>
);
export const SparkleIcon = (p: Props) => (
  <Svg {...p}><path d="M12 3l1.8 4.6 4.7 1.9-4.7 1.9L12 16l-1.8-4.6-4.7-1.9 4.7-1.9z" /><path d="M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></Svg>
);
export const PlusIcon = (p: Props) => (
  <Svg strokeWidth={2} {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>
);
export const MailIcon = (p: Props) => (
  <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Svg>
);
export const SendIcon = (p: Props) => (
  <Svg strokeWidth={2} {...p}><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></Svg>
);
export const AlertIcon = (p: Props) => (
  <Svg strokeWidth={2} {...p}><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4" /><path d="M12 17h.01" /></Svg>
);
export const CheckIcon = (p: Props) => (
  <Svg strokeWidth={2.5} {...p}><path d="M20 6 9 17l-5-5" /></Svg>
);
export const ExternalIcon = (p: Props) => (
  <Svg strokeWidth={2} {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></Svg>
);
export const ArrowInIcon = (p: Props) => (
  <Svg strokeWidth={2.25} {...p}><path d="M17 7 7 17" /><path d="M16 17H7V8" /></Svg>
);
export const PrinterIcon = (p: Props) => (
  <Svg {...p}><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></Svg>
);
export const PaperclipIcon = (p: Props) => (
  <Svg {...p}><path d="m21 11-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l8-8" /></Svg>
);
export const CloseIcon = (p: Props) => (
  <Svg {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>
);
