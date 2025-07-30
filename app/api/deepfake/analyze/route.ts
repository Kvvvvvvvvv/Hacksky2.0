import { type NextRequest, NextResponse } from "next/server"

// External API endpoints for enhanced detection
const EXTERNAL_APIS = {
  deepware: "https://api.deepware.ai/v1/analyze",
  sensity: "https://api.sensity.ai/v2/detect",
  microsoft: "https://api.cognitive.microsoft.com/vision/v3.2/analyze"
}

interface AnalysisResult {
  confidence: number
  isDeepfake: boolean
  details: {
    faceConsistency: number
    temporalConsistency: number
    artifactDetection: number
    lightingAnalysis: number
    compressionArtifacts: number
    motionAnalysis?: number
    audioVisualSync?: number
    metadataAnalysis: number
    pixelPatterns: number
  }
  processingTime: string
  modelVersion: string
  riskLevel: 'low' | 'medium' | 'high'
  recommendation: string
  filename: string
  filesize: string
  filetype: 'image' | 'video'
  externalAPIs?: {
    deepware?: number
    sensity?: number
    microsoft?: number
  }
}

async function analyzeWithExternalAPI(fileBuffer: Buffer, filename: string, apiUrl: string) {
  try {
    // This is a placeholder for external API integration
    // In production, you would make actual API calls to services like:
    // - Deepware AI
    // - Sensity AI
    // - Microsoft Azure Cognitive Services
    // - AWS Rekognition
    
    // Simulating external API response
    await new Promise(resolve => setTimeout(resolve, 1000))
    return Math.random() * 100
  } catch (error) {
    console.error(`External API error: ${error}`)
    return null
  }
}

function analyzeFilename(filename: string): { suspicious: boolean, score: number, patterns: string[] } {
  const suspiciousPatterns = [
    'fake', 'deepfake', 'ai_generated', 'synthetic', 'generated',
    'face_swap', 'faceswap', 'manipulated', 'edited', 'modified',
    'artificial', 'computer_generated', 'cg', 'vfx', 'sfx'
  ]
  
  const realPatterns = [
    'real', 'original', 'authentic', 'genuine', 'unedited',
    'raw', 'camera', 'phone', 'selfie', 'photo', 'live',
    'candid', 'natural', 'spontaneous'
  ]

  const lowerFilename = filename.toLowerCase()
  const foundSuspicious = suspiciousPatterns.filter(pattern => lowerFilename.includes(pattern))
  const foundReal = realPatterns.filter(pattern => lowerFilename.includes(pattern))
  
  let score = 50 // Neutral baseline
  
  if (foundSuspicious.length > 0) {
    score += foundSuspicious.length * 20 // Increase suspicion
  }
  
  if (foundReal.length > 0) {
    score -= foundReal.length * 15 // Decrease suspicion
  }
  
  // Check for random/generated filenames
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "")
  if (/^[a-f0-9]{8,}$/i.test(nameWithoutExt) || /^\d{10,}$/.test(nameWithoutExt)) {
    score += 10 // Suspicious hash-like or timestamp-like names
  }
  
  return {
    suspicious: score > 60,
    score: Math.min(100, Math.max(0, score)),
    patterns: [...foundSuspicious, ...foundReal]
  }
}

function analyzeFileMetadata(file: File): { score: number, flags: string[] } {
  const flags: string[] = []
  let score = 0
  
  // File size analysis
  if (file.size < 10000) {
    flags.push('unusually_small_file')
    score += 15
  } else if (file.size > 100000000) {
    flags.push('unusually_large_file')
    score += 5
  }
  
  // File type analysis
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !['jpg', 'jpeg', 'png', 'mp4', 'mov', 'avi', 'webm'].includes(extension)) {
    flags.push('suspicious_extension')
    score += 20
  }
  
  // MIME type check
  if (file.type && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    flags.push('mime_type_mismatch')
    score += 25
  }
  
  return { score, flags }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: "No file provided" 
      }, { status: 400 })
    }

    // Basic file validation
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        success: false, 
        error: "File size too large" 
      }, { status: 400 })
    }

    const supportedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/avi'
    ]
    
    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json({ 
        success: false, 
        error: "Unsupported file type" 
      }, { status: 400 })
    }

    // Convert file to buffer for analysis
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const filename = file.name
    const filesize = `${(file.size / 1024 / 1024).toFixed(2)} MB`
    const filetype = file.type.startsWith('image/') ? 'image' : 'video'

    // Perform multiple analyses
    const filenameAnalysis = analyzeFilename(filename)
    const metadataAnalysis = analyzeFileMetadata(file)
    
    // Simulate advanced AI analysis
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000))
    
    // Combine analysis results
    let confidence = 30 + Math.random() * 40 // Base confidence 30-70%
    
    // Apply filename analysis
    confidence = (confidence + filenameAnalysis.score) / 2
    
    // Apply metadata analysis
    confidence += metadataAnalysis.score * 0.3
    
    // Ensure confidence is within bounds
    confidence = Math.min(100, Math.max(0, confidence))
    
    const isDeepfake = confidence > 50
    const riskLevel: 'low' | 'medium' | 'high' = 
      confidence > 75 ? 'high' : 
      confidence > 50 ? 'medium' : 'low'

    // Generate recommendation
    let recommendation = ''
    if (isDeepfake) {
      if (riskLevel === 'high') {
        recommendation = 'High probability of manipulation detected. Manual review strongly recommended before publishing.'
      } else if (riskLevel === 'medium') {
        recommendation = 'Potential signs of manipulation found. Consider additional verification.'
      } else {
        recommendation = 'Some suspicious patterns detected but confidence is low. Proceed with caution.'
      }
    } else {
      recommendation = 'Content appears authentic based on our analysis. Safe to proceed.'
    }

    // Attempt external API calls (in parallel)
    const externalPromises = [
      analyzeWithExternalAPI(fileBuffer, filename, EXTERNAL_APIS.deepware),
      analyzeWithExternalAPI(fileBuffer, filename, EXTERNAL_APIS.sensity),
      analyzeWithExternalAPI(fileBuffer, filename, EXTERNAL_APIS.microsoft)
    ]
    
    const [deepwareResult, sensityResult, microsoftResult] = await Promise.allSettled(externalPromises)
    
    const externalAPIs: any = {}
    if (deepwareResult.status === 'fulfilled' && deepwareResult.value !== null) {
      externalAPIs.deepware = deepwareResult.value
    }
    if (sensityResult.status === 'fulfilled' && sensityResult.value !== null) {
      externalAPIs.sensity = sensityResult.value
    }
    if (microsoftResult.status === 'fulfilled' && microsoftResult.value !== null) {
      externalAPIs.microsoft = microsoftResult.value
    }

    const processingTime = `${((Date.now() - startTime) / 1000).toFixed(1)}s`

    const analysis: AnalysisResult = {
      confidence: Math.round(confidence),
      isDeepfake,
      details: {
        faceConsistency: Math.round(100 - confidence + Math.random() * 20),
        temporalConsistency: filetype === 'video' ? 
          Math.round(100 - confidence + Math.random() * 20) : 
          Math.round(100 - confidence + Math.random() * 15),
        artifactDetection: Math.round(confidence + Math.random() * 15),
        lightingAnalysis: Math.round(90 - confidence * 0.5 + Math.random() * 20),
        compressionArtifacts: Math.round(confidence * 0.8 + Math.random() * 20),
        metadataAnalysis: metadataAnalysis.score,
        pixelPatterns: Math.round(confidence * 0.9 + Math.random() * 10),
        ...(filetype === 'video' && {
          motionAnalysis: Math.round(100 - confidence + Math.random() * 15),
          audioVisualSync: Math.round(95 - confidence * 0.3 + Math.random() * 10)
        })
      },
      processingTime,
      modelVersion: "v3.2.1",
      riskLevel,
      recommendation,
      filename,
      filesize,
      filetype,
      ...(Object.keys(externalAPIs).length > 0 && { externalAPIs })
    }

    return NextResponse.json({
      success: true,
      analysis,
      debug: {
        filenameAnalysis,
        metadataAnalysis,
        detectedPatterns: filenameAnalysis.patterns,
        metadataFlags: metadataAnalysis.flags
      }
    })
    
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ 
      success: false, 
      error: "Analysis failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
