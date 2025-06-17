import { redirect } from 'next/navigation'

export default async function Home() {
  // Redirect directly to dashboard since we don't need OAuth
  redirect('/dashboard')
}
