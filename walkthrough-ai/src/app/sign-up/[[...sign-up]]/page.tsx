import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-noise">
      <SignUp
        appearance={{
          variables: { colorPrimary: '#c08e30', colorBackground: '#171310' },
        }}
      />
    </div>
  );
}
