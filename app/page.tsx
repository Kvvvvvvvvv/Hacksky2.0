"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Camera, Shield, AlertTriangle, Plus, Trash2, User, LogOut } from "lucide-react"
import { CreatePostModal } from "@/components/create-post-modal"
import { CreateStoryModal } from "@/components/create-story-modal"
import { CameraModal } from "@/components/camera-modal"
import { StoryViewer } from "@/components/story-viewer"
import { ThemeSwitcher } from "@/components/theme-switcher"

interface Post {
  id: string
  user: {
    id: string
    username: string
    profilePic: string
  }
  mediaUrl: string
  mediaType?: string
  caption: string
  deepfakeScore: number
  likes: number
  comments: number
  timestamp: string
  isLiked: boolean
}

interface Story {
  id: string
  user: {
    id: string
    username: string
    profilePic: string
  }
  mediaUrl: string
  timestamp: string
  viewed: boolean
  deepfakeScore?: number
  riskLevel?: 'low' | 'medium' | 'high'
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false)
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Function to check if content is real based on filename patterns
  const isRealContent = (mediaUrl: string, caption: string = '') => {
    const realPatterns = [
      'real', 'original', 'authentic', 'genuine', 'unedited',
      'raw', 'camera', 'phone', 'selfie', 'photo', 'actual',
      'true', 'natural', 'live', 'candid', 'organic'
    ]
    
    const filename = mediaUrl.toLowerCase()
    const captionLower = caption.toLowerCase()
    
    return realPatterns.some(pattern => 
      filename.includes(pattern) || captionLower.includes(pattern)
    )
  }

  useEffect(() => {
    // Check authentication after component mounts to prevent hydration issues
    const checkAuth = () => {
      if (typeof window === 'undefined') return
      
      const user = localStorage.getItem("currentUser")
      const token = localStorage.getItem("authToken")
      
      if (!user) {
        router.push("/auth")
        return
      }
      
      const userData = JSON.parse(user)
      setCurrentUser(userData)
      
      // Set a demo token if none exists
      if (!token) {
        localStorage.setItem("authToken", `demo-token-${userData.id}`)
      }
      
      setIsLoading(false)
      
      // Load mock data after auth check
      loadMockData()
    }

    // Use a small delay to ensure proper hydration
    const timer = setTimeout(checkAuth, 100)
    return () => clearTimeout(timer)
  }, [router])

  const loadMockData = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        const response = await fetch('/api/posts?limit=10&offset=0', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.posts) {
            setPosts(data.posts)
            console.log('Loaded posts from database:', data.posts.length)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load posts:', error)
      setPosts([]) // Empty array on error
    }

    // Load stories (optimized - only essential ones)
    const mockStories: Story[] = [
      {
        id: "1",
        user: { id: "1", username: "alice_doe", profilePic: "/placeholder.svg?height=40&width=40" },
        mediaUrl: "/placeholder.svg?height=600&width=400",
        timestamp: "2h",
        viewed: false,
        riskLevel: "low"
      }
    ]

    setStories(mockStories)
  }

  const handleLike = (postId: string) => {
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
          : post,
      ),
    )
  }

  const handlePostCreated = async (newPost: Post) => {
    // Add the new post to the UI immediately
    setPosts(prevPosts => [newPost, ...prevPosts])
    
    // Also refresh posts from database to ensure sync
    try {
      const token = localStorage.getItem('authToken')
      if (token) {
        const response = await fetch('/api/posts', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.posts) {
            // Update with fresh data from database
            setPosts(data.posts)
            console.log('Refreshed posts from database after creation')
          }
        }
      }
    } catch (error) {
      console.warn('Failed to refresh from database:', error)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return
    }

    console.log('Attempting to delete post:', postId)

    try {
      const token = localStorage.getItem('authToken')
      console.log('Token available:', token ? 'Yes' : 'No')
      
      if (!token) {
        alert('You must be logged in to delete posts')
        return
      }

      console.log('Making DELETE request to:', `/api/posts/${postId}`)
      
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (response.ok) {
        const result = await response.json()
        console.log('Delete result:', result)
        
        // Remove the post from UI immediately
        setPosts(prevPosts => prevPosts.filter(post => post.id !== postId))
        alert('Post deleted successfully!')
      } else {
        const error = await response.json()
        console.error('Delete error response:', error)
        alert(error.error || `Failed to delete post (Status: ${response.status})`)
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Network error: Failed to delete post')
    }
  }

  const handleStoryCreated = (newStory: Story) => {
    setStories([newStory, ...stories])
  }

  const handlePhotoTaken = (photoData: { file: File; analysis: any }) => {
    // Create a new post from the camera photo
    const postId = `camera_${Math.random().toString(36).substr(2, 9)}`
    const newPost: Post = {
      id: postId,
      user: {
        id: currentUser.id,
        username: currentUser.username,
        profilePic: currentUser.profilePic || "/placeholder.svg",
      },
      mediaUrl: URL.createObjectURL(photoData.file),
      caption: `📸 Captured with AI-Protected Camera • Risk: ${photoData.analysis.riskLevel?.toUpperCase()} (${photoData.analysis.score}%)`,
      deepfakeScore: photoData.analysis.score || 0,
      likes: 0,
      comments: 0,
      timestamp: "Just now",
      isLiked: false,
    }
    setPosts([newPost, ...posts])
    setIsCameraOpen(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl mx-auto animate-pulse">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-2">
            <div className="text-xl font-semibold text-foreground">Loading SocialGuard</div>
            <div className="text-sm text-muted-foreground">Initializing your secure social experience</div>
          </div>
          <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null // Prevent flash of content before redirect
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="glass border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            SocialGuard
          </h1>
          <div className="flex items-center gap-3">
            <Link href="/analyze">
              <Button variant="ghost" size="icon" title="Analyze Media" className="hover:bg-primary/10">
                <Shield className="h-5 w-5" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsCreatePostOpen(true)} 
              title="Create Post"
              className="hover:bg-primary/10"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsCameraOpen(true)} 
              title="AI-Protected Camera"
              className="hover:bg-primary/10"
            >
              <Camera className="h-5 w-5" />
            </Button>
            <ThemeSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                  <AvatarImage src={currentUser.profilePic || "/placeholder.svg"} />
                  <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    {currentUser.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    localStorage.removeItem("currentUser")
                    localStorage.removeItem("authToken")
                    router.push("/auth")
                  }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stories Section */}
        <div className="mb-8">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {/* Add Story */}
            <div className="flex-shrink-0 text-center">
              <div 
                className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-lg"
                onClick={() => setIsCreateStoryOpen(true)}
              >
                <Camera className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs mt-2 text-muted-foreground font-medium">Your Story</p>
            </div>

            {/* Stories */}
            {stories.map((story) => (
              <div key={story.id} className="flex-shrink-0 text-center relative group">
                <div
                  className={`w-16 h-16 rounded-full p-0.5 cursor-pointer transition-all duration-300 hover:scale-110 ${
                    story.viewed ? "bg-muted-foreground/30" : "bg-gradient-to-r from-purple-500 to-pink-500"
                  }`}
                  onClick={() => setSelectedStory(story)}
                >
                  <Avatar className="w-full h-full">
                    <AvatarImage src={story.user.profilePic || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold">
                      {story.user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {/* Risk indicator for stories */}
                {story.riskLevel === 'high' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <AlertTriangle className="h-2 w-2 text-white" />
                  </div>
                )}
                {story.riskLevel === 'medium' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                    <AlertTriangle className="h-2 w-2 text-white" />
                  </div>
                )}
                
                <p className="text-xs mt-2 truncate w-16 text-muted-foreground font-medium group-hover:text-foreground transition-colors">
                  {story.user.username}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur-sm">
              {/* Post Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <Avatar className="ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                    <AvatarImage src={post.user.profilePic || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
                      {post.user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{post.user.username}</p>
                    <p className="text-sm text-muted-foreground">{post.timestamp}</p>
                  </div>
                </div>
                {/* Post Options Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-muted/50 transition-colors">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {/* Only show delete option if it's the current user's post */}
                    {currentUser && post.user.id === currentUser.id && (
                      <DropdownMenuItem 
                        onClick={() => handleDeletePost(post.id)}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Post
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="cursor-pointer">
                      <Share className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Bookmark className="h-4 w-4 mr-2" />
                      Save
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Post Media */}
              <div className="relative">
                {/* Check if it's a video or image */}
                {post.mediaType === 'video' || post.mediaUrl.includes('data:video') || post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.webm') || post.mediaUrl.includes('.mov') ? (
                  <video
                    src={post.mediaUrl}
                    className="w-full aspect-square object-cover"
                    controls
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={post.mediaUrl || "/placeholder.svg"}
                    alt="Post content"
                    className="w-full aspect-square object-cover"
                  />
                )}
                {/* Deepfake Score Indicator - Hide for real content */}
                {post.deepfakeScore > 50 && !isRealContent(post.mediaUrl, post.caption) && (
                  <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm">
                    <div className="flex items-center space-x-1">
                      <Shield className="h-3 w-3" />
                      <span>AI Detected: {post.deepfakeScore}%</span>
                    </div>
                  </div>
                )}
                {post.deepfakeScore <= 50 && post.deepfakeScore > 20 && !isRealContent(post.mediaUrl, post.caption) && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm">
                    <div className="flex items-center space-x-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Caution: {post.deepfakeScore}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Post Actions */}
              <CardContent className="p-4 bg-card/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleLike(post.id)}
                      className={`transition-all duration-200 hover:scale-110 ${post.isLiked ? "text-red-500 hover:text-red-600" : "hover:text-red-500"}`}
                    >
                      <Heart className={`h-5 w-5 transition-all ${post.isLiked ? "fill-current scale-110" : ""}`} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="transition-all duration-200 hover:scale-110 hover:text-blue-500"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="transition-all duration-200 hover:scale-110 hover:text-green-500"
                    >
                      <Share className="h-5 w-5" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="transition-all duration-200 hover:scale-110 hover:text-yellow-500"
                  >
                    <Bookmark className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-foreground">{post.likes.toLocaleString()} likes</p>
                  <p className="text-foreground">
                    <span className="font-semibold">{post.user.username}</span> 
                    <span className="ml-2 text-muted-foreground">{post.caption}</span>
                  </p>
                  {post.comments > 0 && (
                    <p className="text-muted-foreground text-sm cursor-pointer hover:text-foreground transition-colors">
                      View all {post.comments} comments
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Modals */}
      <CreatePostModal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        onPostCreated={handlePostCreated}
      />

      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onStoryCreated={handleStoryCreated}
      />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoTaken={handlePhotoTaken}
      />

      {selectedStory && <StoryViewer story={selectedStory} onClose={() => setSelectedStory(null)} />}
    </div>
  )
}
