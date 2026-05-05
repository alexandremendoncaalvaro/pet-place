import React from 'react';
import { cn } from '../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 active:bg-brand-700',
  secondary: 'bg-ink-100 text-ink-700 hover:bg-ink-200 active:bg-ink-200',
  ghost: 'bg-transparent text-ink-500 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-100',
  danger: 'bg-danger-50 text-danger-600 hover:bg-danger-100 active:bg-danger-100',
  success: 'bg-success-50 text-success-600 hover:bg-success-100 active:bg-success-100',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-sm',
  icon: 'h-10 w-10 p-0',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ className, variant = 'primary', size = 'md', type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({ className, ...props }: ButtonProps) {
  return <Button size="icon" variant="ghost" className={cn('rounded-full', className)} {...props} />;
}

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: 'default' | 'muted' | 'brand';
  as?: React.ElementType;
};

export function Card({ as: Component = 'div', className, tone = 'default', ...props }: CardProps) {
  return (
    <Component
      className={cn(
        'rounded-card border shadow-card',
        tone === 'brand' ? 'border-brand-100 bg-brand-50' : tone === 'muted' ? 'border-ink-200 bg-ink-50' : 'border-ink-100 bg-white',
        className,
      )}
      {...props}
    />
  );
}

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
  as?: React.ElementType;
};

export function Badge({ as: Component = 'span', className, tone = 'neutral', ...props }: BadgeProps) {
  const toneClass = {
    neutral: 'bg-ink-100 text-ink-500',
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success-100 text-success-600',
    warning: 'bg-warning-100 text-warning-600',
    danger: 'bg-danger-100 text-danger-600',
  }[tone];

  return <Component className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', toneClass, className)} {...props} />;
}

export function FieldLabel({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-500', className)} {...props} />;
}

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-control border border-ink-200 bg-ink-50 px-4 py-3 font-medium text-ink-700 outline-none transition-all placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15',
        className,
      )}
      {...props}
    />
  );
});

export function EmptyState({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500', className)} {...props} />;
}

export function Page({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto max-w-lg p-6 pb-24', className)} {...props} />;
}

export function SectionTitle({
  children,
  icon,
  action,
  className,
}: React.HTMLAttributes<HTMLDivElement> & { icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3', className)}>
      <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-ink-900">
        {icon}
        <span className="truncate">{children}</span>
      </h2>
      {action}
    </div>
  );
}

export function ModalSurface({
  as: Component = 'div',
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { as?: React.ElementType }) {
  return (
    <Component
      className={cn(
        'relative max-h-[90vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-6 shadow-2xl sm:max-w-md sm:rounded-card',
        className,
      )}
      {...props}
    />
  );
}

export function FieldGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-2', className)} {...props} />;
}
