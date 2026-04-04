import { SignUp } from "@clerk/nextjs";
export default function SignUpPage() {
  return (
    <div className="flex justify-center pt-20">
      <SignUp />
    </div>
  );
}
