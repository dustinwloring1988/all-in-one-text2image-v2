'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, User, Settings, LogOut } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { supabase, updateUserCredits } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'

type User = {
  id: string;
  name: string;
  email: string;
  credits: number;
}

const fetchUserCredits = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user credits:', error);
    return 0;
  }

  return data?.credits || 0;
};

export default function AdvancedTextToImageGenerator() {
  const router = useRouter();

  const [prompt, setPrompt] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [numOutputs, setNumOutputs] = useState(1)
  const [seed, setSeed] = useState<number | undefined>(undefined)
  const [goFast, setGoFast] = useState(true)
  const [megapixels, setMegapixels] = useState('1')
  const [outputFormat, setOutputFormat] = useState('webp')
  const [outputQuality, setOutputQuality] = useState(80)
  const [numInferenceSteps, setNumInferenceSteps] = useState(4)
  const [disableSafetyChecker, setDisableSafetyChecker] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Authentication and user management
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [showTopOffModal, setShowTopOffModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')

  const [creditUpdateProcessed, setCreditUpdateProcessed] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const userCredits = await fetchUserCredits(session.user.id);
        setUser({
          id: session.user.id,
          name: session.user.user_metadata.name || 'User',
          email: session.user.email || '',
          credits: userCredits,
        })
        setIsLoggedIn(true)
      }
    }
    checkSession()
  }, [user, creditUpdateProcessed, router])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || !user) {
      toast.error('Please log in to generate images.');
      return;
    }
    
    const creditCost = 2 * numOutputs;
    
    if (user.credits < creditCost) {
      toast.error(`Not enough credits. You need ${creditCost} credits for ${numOutputs} output(s).`);
      return;
    }
    
    setIsLoading(true);
    setGeneratedImages([]);

    const input = {
      prompt,
      aspect_ratio: aspectRatio,
      num_outputs: numOutputs,
      seed,
      go_fast: goFast,
      megapixels,
      output_format: outputFormat,
      output_quality: outputQuality,
      num_inference_steps: numInferenceSteps,
      disable_safety_checker: disableSafetyChecker,
    };

    try {
      // Save prompt history
      const { error: historyError } = await supabase
        .from('prompt_history')
        .insert({ user_id: user.id, ...input });

      if (historyError) throw historyError;

      // Update user credits
      const { error: creditsError } = await supabase
        .from('user_credits')
        .update({ credits: user.credits - creditCost })
        .eq('user_id', user.id);

      if (creditsError) throw creditsError;

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error('Failed to generate image');
      }
      const data = await response.json();
      setGeneratedImages(data);
      
      // Show success toast after credits are updated
      toast.success(`Generated images successfully! Credits remaining: ${user.credits - creditCost}`);
    } catch (error) {
      console.error('Error generating images:', error);
      toast.error('Failed to generate images. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, aspectRatio, numOutputs, seed, goFast, megapixels, outputFormat, outputQuality, numInferenceSteps, disableSafetyChecker, isLoggedIn, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      const userCredits = await fetchUserCredits(data.user?.id || '');

      setUser({
        id: data.user?.id || '',
        name: data.user?.user_metadata?.name || 'User',
        email: data.user?.email || '',
        credits: userCredits,
      })
      setIsLoggedIn(true)
      setShowLoginModal(false)
      toast.success('Logged in successfully!')
    } catch (error) {
      console.error('Error logging in:', error)
      toast.error('Failed to log in. Please try again.')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })
      if (error) throw error

      // Create user_credits entry
      const { error: creditsError } = await supabase
        .from('user_credits')
        .insert({ user_id: data.user?.id, credits: 10 })

      if (creditsError) throw creditsError

      setUser({
        id: data.user?.id || '',
        name: data.user?.user_metadata?.name || name,
        email: data.user?.email || email,
        credits: 10
      })
      setIsLoggedIn(true)
      setShowRegisterModal(false)
      toast.success('Registered successfully! Please check your email to confirm your account.')
    } catch (error) {
      console.error('Error registering:', error)
      toast.error('Failed to register. Please try again.')
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
      setShowForgotPasswordModal(false)
      toast.success('Password reset email sent!')
    } catch (error) {
      console.error('Error sending reset password email:', error)
      toast.error('Failed to send reset password email. Please try again.')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      setShowResetPasswordModal(false);
      toast.success('Password reset successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password. Please try again.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      setShowChangePasswordModal(false);
      toast.success('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setIsLoggedIn(false)
      toast.success('Logged out successfully!')
    } catch (error) {
      console.error('Error logging out:', error)
      toast.error('Failed to log out. Please try again.')
    }
  }

  const handleBuyCredits = async (amount: number) => {
    // Remove Stripe integration
    // const response = await fetch('/api/create-checkout-session', { ... });

    // Directly update user credits
    amount = amount * 10;
    handleCreditUpdate(amount); // Call the credit update function directly
  };

  const handleCreditUpdate = async (creditAmount: number) => {
    if (user) {
      const newCredits = await updateUserCredits(user.id, creditAmount);
      setUser({ ...user, credits: newCredits });
      toast.success(`Credits updated successfully! New balance: ${newCredits}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <header className="bg-gray-900 py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">ImageAI</h1>
          {isLoggedIn && user ? (
            <div className="flex items-center space-x-4">
              <span>Credits: {user.credits}</span>
              <Button onClick={() => setShowTopOffModal(true)}>Top Off</Button>
              <Button onClick={() => setShowChangePasswordModal(true)}>Change Password</Button>
              <Button onClick={handleLogout}>Log Out</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <User className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowTopOffModal(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Top Off</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowChangePasswordModal(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Change Password</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="space-x-2">
              <Button onClick={() => setShowLoginModal(true)}>Login</Button>
              <Button onClick={() => setShowRegisterModal(true)}>Register</Button>
            </div>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 flex-grow">
        <section className="mb-12 text-center">
          <h2 className="text-4xl font-bold mb-4">Transform Your Words into Stunning Visuals</h2>
          <p className="text-xl text-gray-300 mb-8">Harness the power of AI to create unique, high-quality images from your text descriptions.</p>
        </section>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="prompt" className="text-white">Describe your image</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A futuristic cityscape with flying cars and neon lights..."
                  required
                  className="mt-1 bg-gray-700 border-gray-600 placeholder-gray-400"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aspectRatio" className="text-white">Aspect Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger id="aspectRatio" className="bg-gray-700 border-gray-600">
                      <SelectValue placeholder="Select aspect ratio" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="1:1">1:1 (Square)</SelectItem>
                      <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                      <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                      <SelectItem value="3:2">3:2 (Classic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="numOutputs" className="text-white">Number of Outputs</Label>
                  <Input
                    id="numOutputs"
                    type="number"
                    min={1}
                    max={4}
                    value={numOutputs}
                    onChange={(e) => setNumOutputs(Number(e.target.value))}
                    className="bg-gray-700 border-gray-600"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="showAdvanced"
                  checked={showAdvanced}
                  onCheckedChange={setShowAdvanced}
                />
                <Label htmlFor="showAdvanced" className="text-white">Show Advanced Options</Label>
              </div>
              {showAdvanced && (
                <div className="space-y-4 p-4 bg-gray-700 rounded-md">
                  <div>
                    <Label htmlFor="seed" className="text-white">Seed (optional)</Label>
                    <Input
                      id="seed"
                      type="number"
                      value={seed || ''}
                      onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Random seed for reproducible generation"
                      className="bg-gray-600 border-gray-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="goFast"
                      checked={goFast}
                      onCheckedChange={setGoFast}
                    />
                    <Label htmlFor="goFast" className="text-white">Go Fast (Optimized for Speed)</Label>
                  </div>
                  <div>
                    <Label htmlFor="megapixels" className="text-white">Megapixels</Label>
                    <Select value={megapixels} onValueChange={setMegapixels}>
                      <SelectTrigger id="megapixels" className="bg-gray-600 border-gray-500">
                        <SelectValue placeholder="Select megapixels" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-600 border-gray-500">
                        <SelectItem value="1">1 MP</SelectItem>
                        <SelectItem value="0.25">0.25 MP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="outputFormat" className="text-white">Output Format</Label>
                    <Select value={outputFormat} onValueChange={setOutputFormat}>
                      <SelectTrigger id="outputFormat" className="bg-gray-600 border-gray-500">
                        <SelectValue placeholder="Select output format" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-600 border-gray-500">
                        <SelectItem value="webp">WebP</SelectItem>
                        <SelectItem value="jpg">JPG</SelectItem>
                        <SelectItem value="png">PNG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="outputQuality" className="text-white">Output Quality</Label>
                    <Slider
                      id="outputQuality"
                      min={0}
                      max={100}
                      step={1}
                      value={[outputQuality]}
                      onValueChange={(value) => setOutputQuality(value[0])}
                      className="mt-2"
                    />
                    <span className="text-sm text-gray-300">{outputQuality}</span>
                  </div>
                  <div>
                    <Label htmlFor="numInferenceSteps" className="text-white">Number of Inference Steps</Label>
                    <Input
                      id="numInferenceSteps"
                      type="number"
                      min={1}
                      max={4}
                      value={numInferenceSteps}
                      onChange={(e) => setNumInferenceSteps(Number(e.target.value))}
                      className="bg-gray-600 border-gray-500"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="disableSafetyChecker"
                      checked={disableSafetyChecker}
                      onCheckedChange={setDisableSafetyChecker}
                    />
                    <Label htmlFor="disableSafetyChecker" className="text-white">Disable Safety Checker</Label>
                  </div>
                </div>
              )}
              <Button type="submit" disabled={isLoading || !isLoggedIn} className="w-full bg-blue-600 hover:bg-blue-700">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  `Generate Image (${2 * numOutputs} credits)`
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        {generatedImages.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Generated Images</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedImages.map((imageUrl, index) => (
                <Card key={index} className="bg-gray-800 border-gray-700 overflow-hidden">
                  <CardContent className="p-0">
                    <img src={imageUrl} alt={`Generated image ${index + 1}`} className="w-full h-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
      <footer className="bg-gray-900 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>&copy; 2024 ImageAI. All rights reserved.</p>
        </div>
      </footer>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Login</DialogTitle>
            <DialogDescription>
              Enter your credentials to access your account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Login</Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            <Button variant="link" onClick={() => { setShowLoginModal(false); setShowForgotPasswordModal(true); }}>
              Forgot password?
            </Button>
            <div>
              <span className="text-sm text-muted-foreground">Don't have an account? </span>
              <Button variant="link" onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }}>
                Register
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Modal */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Register</DialogTitle>
            <DialogDescription>
              Create a new account to start generating images.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Register</Button>
          </form>
          <div className="mt-4 text-center">
            <span className="text-sm text-muted-foreground">Already have an account? </span>
            <Button variant="link" onClick={() => { setShowRegisterModal(false); setShowLoginModal(true); }}>
              Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPasswordModal} onOpenChange={setShowForgotPasswordModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
            <DialogDescription>
              Enter your email to receive a password reset link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Send Reset Link</Button>
          </form>
          <div className="mt-4 text-center">
            <span className="text-sm text-muted-foreground">Remember your password? </span>
            <Button variant="link" onClick={() => { setShowForgotPasswordModal(false); setShowLoginModal(true); }}>
              Back to Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={showResetPasswordModal} onOpenChange={setShowResetPasswordModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <Input id="confirmNewPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Reset Password</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={showChangePasswordModal} onOpenChange={setShowChangePasswordModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" required />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <Input id="confirmNewPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">Change Password</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Top Off Modal */}
      <Dialog open={showTopOffModal} onOpenChange={setShowTopOffModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Top Off Credits</DialogTitle>
            <DialogDescription>
              Purchase more credits to generate images.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Credits</Label>
              <p className="text-2xl font-bold">{user?.credits || 0}</p>
            </div>
            <div>
              <Label>Buy Credits</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button onClick={() => handleBuyCredits(5)} className="w-full">$5 (50 credits)</Button>
                <Button onClick={() => handleBuyCredits(10)} className="w-full">$10 (100 credits)</Button>
                <Button onClick={() => handleBuyCredits(20)} className="w-full">$20 (200 credits)</Button>
                <Button onClick={() => handleBuyCredits(25)} className="w-full">$25 (250 credits)</Button>
              </div>
            </div>
            <p className="text-sm text-gray-500">1 credit = $0.10. Maximum 300 credits.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Payment Successful</DialogTitle>
            <DialogDescription>
              Thank you for your purchase! Your credits have been added to your account.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 text-center">
            <Button onClick={() => setShowSuccessModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}