import { useState } from 'react';
import { useLocation, useRoute, Redirect } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type AuthFormData = {
  email: string;
  password: string;
};

// Form validation schema
const authFormSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function AuthPage() {
  const [_, navigate] = useLocation();
  const [isMatch] = useRoute('/auth');
  const { currentUser, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('login');
  const [authError, setAuthError] = useState<string | null>(null);

  // Redirect if already logged in
  if (currentUser && !isLoading && isMatch) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Authentication form */}
      <div className="flex flex-col w-full lg:w-1/2 p-8 justify-center items-center">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-primary">ChattyAI</h1>
            <p className="text-muted-foreground mt-2">Your intelligent chat assistant powered by Gemini</p>
          </div>

          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome back</CardTitle>
                  <CardDescription>
                    Sign in to your account to continue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AuthForm 
                    mode="login" 
                    onSubmit={(data) => setAuthError(null)}
                    authError={authError}
                    setAuthError={setAuthError}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Register to start chatting with ChattyAI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AuthForm 
                    mode="register" 
                    onSubmit={(data) => setAuthError(null)}
                    authError={authError}
                    setAuthError={setAuthError}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <OAuthButtons setAuthError={setAuthError} />
          
          <GuestLoginButton setAuthError={setAuthError} />
        </div>
      </div>

      {/* Right side - Hero/Info section */}
      <div className="hidden lg:flex flex-col w-1/2 bg-gradient-to-br from-primary to-primary/60 text-primary-foreground p-8 justify-center">
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-5xl font-bold">Experience the power of AI conversations</h1>
          <p className="text-xl opacity-90">
            ChattyAI uses Google's Gemini technology to provide intelligent responses to your questions and help you accomplish tasks.
          </p>
          <ul className="space-y-3 text-lg">
            <li className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary-foreground flex items-center justify-center">
                <span className="text-primary text-sm">✓</span>
              </div>
              <span>Ask questions and get detailed answers</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary-foreground flex items-center justify-center">
                <span className="text-primary text-sm">✓</span>
              </div>
              <span>Share images and get visual analysis</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary-foreground flex items-center justify-center">
                <span className="text-primary text-sm">✓</span>
              </div>
              <span>Save and access your conversation history</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Authentication form component
function AuthForm({ 
  mode,
  onSubmit,
  authError,
  setAuthError
}: { 
  mode: 'login' | 'register'; 
  onSubmit: (data: AuthFormData) => void;
  authError: string | null;
  setAuthError: (error: string | null) => void;
}) {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [_, navigate] = useLocation();

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function handleSubmit(data: AuthFormData) {
    try {
      setAuthError(null);
      
      if (mode === 'login') {
        await signInWithEmail(data.email, data.password);
      } else {
        await signUpWithEmail(data.email, data.password);
      }
      
      onSubmit(data);
      navigate('/');
    } catch (error) {
      setAuthError((error as Error).message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </Button>
      </form>
    </Form>
  );
}

// OAuth buttons component
function OAuthButtons({ setAuthError }: { setAuthError: (error: string | null) => void }) {
  const { signInWithGoogle } = useAuth();
  const [_, navigate] = useLocation();

  async function handleGoogleSignIn() {
    try {
      setAuthError(null);
      await signInWithGoogle();
      navigate('/');
    } catch (error) {
      setAuthError((error as Error).message);
    }
  }

  return (
    <div className="grid gap-2">
      <Button variant="outline" onClick={handleGoogleSignIn} type="button">
        <svg
          className="mr-2 h-4 w-4"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
            fill="#EA4335"
          />
          <path
            d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
            fill="#4285F4"
          />
          <path
            d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
            fill="#FBBC05"
          />
          <path
            d="M12.0004 24C15.2404 24 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.25 12.0004 19.25C8.8704 19.25 6.21537 17.14 5.2654 14.295L1.27539 17.39C3.25539 21.31 7.3104 24 12.0004 24Z"
            fill="#34A853"
          />
        </svg>
        Continue with Google
      </Button>
    </div>
  );
}

// Guest login button
function GuestLoginButton({ setAuthError }: { setAuthError: (error: string | null) => void }) {
  const { signInAsGuest } = useAuth();
  const [_, navigate] = useLocation();

  async function handleGuestSignIn() {
    try {
      setAuthError(null);
      await signInAsGuest();
      navigate('/');
    } catch (error) {
      setAuthError((error as Error).message);
    }
  }

  return (
    <Button variant="ghost" onClick={handleGuestSignIn} className="w-full" type="button">
      Continue as Guest
    </Button>
  );
}