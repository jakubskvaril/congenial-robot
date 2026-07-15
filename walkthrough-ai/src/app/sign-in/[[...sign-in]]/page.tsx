import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-noise">
      <SignIn
        appearance={{
          variables: { colorPrimary: '#c08e30', colorBackground: '#171310' },
        }}
      />
    </div>
  );
}
