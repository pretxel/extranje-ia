import { SignIn } from "@clerk/nextjs";
export default function SignInPage() {
  return (
    <div className="flex justify-center pt-20">
      <SignIn />
    </div>
  );
}
