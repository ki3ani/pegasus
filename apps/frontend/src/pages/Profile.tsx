import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Navigation from '../components/Navigation'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { 
  UserCircleIcon, 
  PencilIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import { AlertCircle, Save, X } from 'lucide-react'

export default function Profile() {
  const { profile, updateProfile, loading, error } = useAuth()
  
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    avatar_url: profile?.avatar_url || ''
  })
  const [originalForm, setOriginalForm] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    avatar_url: profile?.avatar_url || ''
  })
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      const formData = {
        full_name: profile.full_name || '',
        email: profile.email || '',
        avatar_url: profile.avatar_url || ''
      }
      setEditForm(formData)
      setOriginalForm(formData)
    }
  }, [profile])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('✨ Optimistic profile update!')
    
    let avatarUrl = editForm.avatar_url
    if (avatarFile && avatarPreview) {
      avatarUrl = avatarPreview
    }
    
    const updates = {
      full_name: editForm.full_name.trim() || null,
      avatar_url: avatarUrl || null
    }
    
    // Store current state for potential rollback
    const optimisticForm = {
      full_name: updates.full_name || '',
      email: editForm.email,
      avatar_url: updates.avatar_url || ''
    }
    
    console.log('⚡ Instant UI update - closing form')
    setIsEditing(false)
    setAvatarFile(null)
    setAvatarPreview(null)
    
    // Apply optimistic update
    setEditForm(optimisticForm)
    
    // Save to database in background
    console.log('💾 Background save starting...')
    updateProfile(updates)
      .then(({ error }) => {
        if (error) {
          console.error('❌ Background save failed, reverting changes:', error)
          // Revert to original form data on failure
          setEditForm(originalForm)
          // Could show error toast here
        } else {
          console.log('✅ Background save completed')
          // Update original form to match successful save
          setOriginalForm(optimisticForm)
        }
      })
      .catch(error => {
        console.error('❌ Background save error, reverting changes:', error)
        // Revert to original form data on error
        setEditForm(originalForm)
        // Could show error toast here
      })
  }

  const handleEditCancel = () => {
    setEditForm(originalForm)
    setIsEditing(false)
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  // Extract avatar logic to avoid duplication
  const displayAvatarUrl = editForm.avatar_url?.trim() || profile?.avatar_url
  const displayFullName = editForm.full_name?.trim() || profile?.full_name || 'Not set'

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserCircleIcon className="h-5 w-5" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>
                      Update your profile details and contact information
                    </CardDescription>
                  </div>
                  {!isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 flex items-center space-x-2 bg-destructive/15 border border-destructive/20 text-destructive px-3 py-2 rounded-lg text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error.message || 'An error occurred'}</span>
                  </div>
                )}

                {isEditing ? (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Full Name</label>
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Profile Picture</label>
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {avatarPreview || profile?.avatar_url ? (
                            <img 
                              src={avatarPreview || profile?.avatar_url || ''} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserCircleIcon className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        disabled
                        className="w-full px-3 py-2 border border-input rounded-md bg-muted text-muted-foreground cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        onClick={() => {
                          console.log('Save button clicked!')
                          // Don't prevent default, let form submission handle it
                        }}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                        onClick={handleEditCancel}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Profile Picture</label>
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {displayAvatarUrl ? (
                          <img 
                            src={displayAvatarUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCircleIcon className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                      <p className="text-lg">{displayFullName}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-lg">{profile?.email}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Account Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <EnvelopeIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email Verified</p>
                    <p className="text-xs text-green-600">✓ Confirmed</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <UserCircleIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Account Type</p>
                    <p className="text-xs text-muted-foreground">Standard User</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security</CardTitle>
                <CardDescription>
                  Your account security settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Two-Factor Authentication</span>
                    <span className="text-xs text-muted-foreground">Coming Soon</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Google Authentication</span>
                    <span className="text-xs text-green-600">✓ Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/20">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2 text-sm">
                    <ExclamationTriangleIcon className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Delete Account</p>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete your account and all associated data
                      </p>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" disabled>
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}