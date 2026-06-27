import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({className, ...props}, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[100px] w-full rounded-2xl border-2 border-black/10 dark:border-white/20 bg-[#f5f5f7] dark:bg-[#1d1d1f] px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground hover:border-black/20 dark:hover:border-white/30 hover:bg-[#efeff1] dark:hover:bg-[#252527] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]/30 focus-visible:border-[#0071e3]/50 focus-visible:bg-white dark:focus-visible:bg-black disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export {Textarea};
