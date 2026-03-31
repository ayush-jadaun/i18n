import { redirect } from 'next/navigation';

/**
 * Root page — redirects to the organisations list.
 */
export default function HomePage() {
  redirect('/orgs');
}
