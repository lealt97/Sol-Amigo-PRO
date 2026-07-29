import { BrandLogo } from '../components/brand/BrandLogo';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';

export function ResetPassword() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-brand-gray p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="mx-auto w-full max-w-[220px] px-4">
          <BrandLogo format="horizontal" surface="auto" className="h-auto w-full" loading="eager" />
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
