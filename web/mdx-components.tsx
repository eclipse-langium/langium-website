import type { MDXComponents } from 'mdx/types';
import { Notification } from '@/components/mdx/Notification';
import { Hint } from '@/components/mdx/Hint';
import { Tabs, Tab } from '@/components/mdx/Tabs';
import { Expand } from '@/components/mdx/Expand';
import { Columns } from '@/components/mdx/Columns';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Notification,
    Hint,
    Tabs,
    Tab,
    Expand,
    Columns,
    ...components,
  };
}
