import { signup } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function SignupPage({
    searchParams,
  }: {
    searchParams?: { [key: string]: string | string[] | undefined }
  }) {
    const errorMessage = typeof searchParams?.error === 'string' ? searchParams.error : null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-black px-4">
      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signup} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                className="bg-zinc-950 border-zinc-800 text-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                 className="bg-zinc-950 border-zinc-800 text-white"
              />
            </div>
             {errorMessage && (
                <div className="text-red-500 text-sm font-medium">
                    {errorMessage}
                </div>
            )}
            <Button type="submit" className="w-full">
              Create an account
            </Button>
            <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800 hover:text-white bg-transparent">
              Sign up with Google
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <div className="mt-4 text-center text-sm text-zinc-400 w-full">
            Already have an account?{" "}
            <Link href="/login" className="underline text-white">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
