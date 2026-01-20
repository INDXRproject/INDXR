import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage({
    searchParams,
  }: {
    searchParams?: { [key: string]: string | string[] | undefined }
  }) {
    
    // Casting searchParams to handle potentially undefined or array values safely if needed in logic,
    // but for simple display:
    const errorMessage = typeof searchParams?.error === 'string' ? searchParams.error : null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-black px-4">
      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="grid gap-4">
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
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="ml-auto inline-block text-sm underline text-zinc-400">
                  Forgot your password?
                </Link>
              </div>
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
              Login
            </Button>
            <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800 hover:text-white bg-transparent">
              Login with Google
            </Button>
          </form>
        </CardContent>
        <CardFooter>
           <div className="mt-4 text-center text-sm text-zinc-400 w-full">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline text-white">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
