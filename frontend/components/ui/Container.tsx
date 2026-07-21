import type { ElementType, ReactNode } from 'react';

export type ContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Fixed px scale (not Tailwind's default max-w-* keywords, which don't line
// up with these numbers) — keep the class strings literal so Tailwind's JIT
// scanner can see them.
const SIZE_CLASS: Record<ContainerSize, string> = {
  xs: 'max-w-[40rem]', // 640px
  sm: 'max-w-[48rem]', // 768px
  md: 'max-w-[60rem]', // 960px
  lg: 'max-w-[71.25rem]', // 1140px
  xl: 'max-w-[80rem]', // 1280px — the site-wide default page width
  '2xl': 'max-w-[90rem]', // 1440px
};

/**
 * The one page-width container for the whole site — every page should wrap
 * its content in this instead of a hand-rolled `mx-auto max-w-… px-…` div, so
 * width and horizontal padding stay consistent everywhere (header, footer,
 * and every page align to the same 1280px by default).
 */
export default function Container({
  size = 'xl',
  as: Tag = 'div',
  className = '',
  children,
}: {
  size?: ContainerSize;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${SIZE_CLASS[size]} ${className}`}>
      {children}
    </Tag>
  );
}
