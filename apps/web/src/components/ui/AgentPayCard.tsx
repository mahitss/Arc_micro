import React from 'react';

export interface AgentPayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'elevated' | 'subtle';
  border?: 'default' | 'strong' | 'subtle' | 'none';
  interactive?: boolean;
}

export function AgentPayCard({
  variant = 'primary',
  border = 'default',
  interactive = false,
  className = '',
  children,
  ...props
}: AgentPayCardProps) {
  const bgClasses = {
    primary: 'bg-[#101010]',
    secondary: 'bg-[#141414]',
    elevated: 'bg-[#181818]',
    subtle: 'bg-[#0B0B0B]',
  }[variant];

  const borderClasses = {
    default: 'border border-[#222222]',
    strong: 'border border-[#2B2B2B]',
    subtle: 'border border-[#1A1A1A]',
    none: 'border-0',
  }[border];

  const interactiveClasses = interactive
    ? 'transition-all duration-150 hover:border-[#2B2B2B] hover:bg-[#141414] cursor-pointer'
    : '';

  return (
    <div
      className={`rounded-xl ${bgClasses} ${borderClasses} ${interactiveClasses} text-[#F2F0EA] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function AgentPayCardHeader({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 sm:p-5 border-b border-[#222222] ${className}`} {...props}>
      {children}
    </div>
  );
}

export function AgentPayCardContent({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function AgentPayCardFooter({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 sm:p-5 border-t border-[#222222] bg-[#0A0A0A] rounded-b-xl ${className}`} {...props}>
      {children}
    </div>
  );
}
