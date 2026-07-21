import { redirect } from 'next/navigation';

/** Legacy combined signup route — send visitors to the role-specific page. */
export default async function SignupRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const role = params.role;
  const isLawyer = (Array.isArray(role) ? role[0] : role)?.toLowerCase() === 'lawyer';

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'role') continue;
    if (typeof value === 'string') qs.set(key, value);
    else if (Array.isArray(value) && value[0] !== undefined) qs.set(key, value[0]);
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  redirect(`/signup/${isLawyer ? 'lawyer' : 'client'}${suffix}`);
}
