import { cx } from '@/lib/format';

type Variant = 'default' | 'primary' | 'danger';
const variants: Record<Variant, string> = {
  default: 'border-edge bg-white text-strong hover:bg-brand-soft',
  primary: 'border-brand bg-brand text-white hover:bg-brand-dark hover:border-brand-dark',
  danger: 'border-danger bg-danger text-white hover:opacity-90',
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean };

export function Button({ variant = 'default', small, className, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[10px] border font-semibold whitespace-nowrap transition-colors active:translate-y-px disabled:opacity-50 [&_svg]:size-[17px] [&_svg]:shrink-0',
        small ? 'min-h-9 px-3 py-1 text-[13px]' : 'min-h-11 px-4 py-2',
        variants[variant], className,
      )}
      {...rest}
    />
  );
}

export function IconButton({ className, type = 'button', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cx('grid size-11 place-items-center rounded-[10px] text-muted transition-colors hover:bg-soft disabled:opacity-40 [&_svg]:size-5', className)}
      {...rest}
    />
  );
}
