import type { ComponentPropsWithoutRef } from 'react';
import { CHECKOUT_URL } from '@/lib/site';

/**
 * A real link to the hosted Lemon Squeezy checkout. With JavaScript off, or before lemon.js has loaded, it simply
 * opens that page. Once lemon.js is ready, components/checkout/LemonSqueezy.tsx upgrades the click to the dark-mode
 * overlay (the data-checkout attribute is the hook).
 */
export function CheckoutLink({ className, children, ...rest }: Omit<ComponentPropsWithoutRef<'a'>, 'href'>) {
  return (
    <a href={CHECKOUT_URL} data-checkout="" aria-haspopup="dialog" className={className} {...rest}>
      {children}
    </a>
  );
}
