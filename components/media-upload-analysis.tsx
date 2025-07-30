'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  X, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  FileImage,
  FileVideo,
  Loader2,
  Eye,
  Trash2
} from 'lucide-react'
import { useMediaAnalysis } from '@/hooks/use-media-analysis'
import { MediaAnalysisService, MediaAnalysisResult } from '@/lib/media-analysis'
import { cn } from '@/lib/utils'

interface MediaUploadWithAnalysisProps {
  onFilesAnalyzed?: (results: MediaAnalysisResult[]) => void
  onFilesSelected?: (files: File[]) => void
  maxFiles?: number
  autoAnalyze?: boolean
  allowedTypes?: string[]
  className?: string
  showDetailedResults?: boolean
}

export function MediaUploadWithAnalysis({
  onFilesAnalyzed,
  onFilesSelected,
  maxFiles = 5,
  autoAnalyze = true,
  allowedTypes = ['image/*', 'video/*'],
  className,
  showDetailedResults = true
}: MediaUploadWithAnalysisProps) {
  const [showPreview, setShowPreview] = useState(true)
  
  const {
    isAnalyzing,
    results,
    files,
    error,
    progress,
    addFiles,
    removeFile,
    clearAll,
    analyzeFiles,
    getResultForFile,
    hasFiles,
    hasResults,
    canAnalyze
  } = useMediaAnalysis({
    autoAnalyze,
    maxFiles,
    onAnalysisComplete: onFilesAnalyzed,
    onError: (err) => console.error('Analysis error:', err)
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: allowedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles,
    onDrop: useCallback(async (acceptedFiles: File[]) => {
      onFilesSelected?.(acceptedFiles)
      await addFiles(acceptedFiles)
    }, [addFiles, onFilesSelected])
  })

  const handleManualAnalyze = useCallback(async () => {
    if (canAnalyze) {
      await analyzeFiles(files.map(f => f.file))
    }
  }, [canAnalyze, analyzeFiles, files])

  const getRiskBadge = (result: MediaAnalysisResult) => {
    const { riskLevel, score } = result
    
    // Handle undefined or null values
    if (!riskLevel || !score) {
      return (
        <Badge variant="secondary" className="text-white bg-gray-500">
          UNKNOWN: 0%
        </Badge>
      )
    }
    
    const colorClass = MediaAnalysisService.getRiskColor(riskLevel)
    const bgClass = MediaAnalysisService.getRiskBgColor(riskLevel)
    
    return (
      <Badge 
        variant="secondary" 
        className={cn("text-white", bgClass)}
      >
        {riskLevel.toUpperCase()}: {score}%
      </Badge>
    )
  }

  const getFileIcon = (type: 'image' | 'video') => {
    return type === 'video' ? <FileVideo className="h-5 w-5" /> : <FileImage className="h-5 w-5" />
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <Card className="border-2 border-dashed border-border/50 hover:border-border transition-colors">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              "text-center cursor-pointer transition-colors rounded-lg p-8",
              isDragActive ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? "Drop files here" : "Upload media for analysis"}
              </p>
              <p className="text-sm text-muted-foreground">
                Drag & drop or click to select images/videos
              </p>
              <p className="text-xs text-muted-foreground">
                Max {maxFiles} files • AI-powered deepfake detection
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">Analyzing media...</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              Using advanced AI to detect deepfakes and manipulation
            </p>
          </CardContent>
        </Card>
      )}

      {/* Files Preview and Results */}
      {hasFiles && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Uploaded Files ({files.length})
              </h3>
              <div className="flex items-center gap-2">
                {!autoAnalyze && canAnalyze && (
                  <Button 
                    onClick={handleManualAnalyze}
                    size="sm"
                    variant="outline"
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Analyze
                  </Button>
                )}
                <Button 
                  onClick={clearAll}
                  size="sm"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {files.map((file) => {
                const result = getResultForFile(file.id)
                
                return (
                  <div key={file.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    {/* File Preview */}
                    <div className="flex-shrink-0">
                      {showPreview ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                          {file.type === 'video' ? (
                            <video 
                              src={file.preview} 
                              className="w-full h-full object-cover"
                              muted
                            />
                          ) : (
                            <img 
                              src={file.preview} 
                              alt={file.file.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          {getFileIcon(file.type)}
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-grow">
                          <p className="font-medium truncate">{file.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {MediaAnalysisService.formatFileSize(file.file.size)} • {file.type}
                          </p>
                        </div>
                        
                        <Button
                          onClick={() => removeFile(file.id)}
                          size="sm"
                          variant="ghost"
                          className="ml-2 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Analysis Result */}
                      {result && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            {result.isDeepfake ? (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {getRiskBadge(result)}
                            <span className="text-sm text-muted-foreground">
                              {result.processingTime}ms
                            </span>
                          </div>

                          {showDetailedResults && result.details && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>Face: {result.details.faceConsistency || 0}%</div>
                              <div>Temporal: {result.details.temporalConsistency || 0}%</div>
                              <div>Artifacts: {result.details.artifactDetection || 0}%</div>
                              <div>Lighting: {result.details.lightingAnalysis || 0}%</div>
                            </div>
                          )}

                          {result.recommendations && result.recommendations.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <strong>Recommendations:</strong> {result.recommendations.join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {hasResults && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Analysis Summary
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {results.filter(r => r.riskLevel === 'low').length}
                </div>
                <div className="text-sm text-muted-foreground">Low Risk</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">
                  {results.filter(r => r.riskLevel === 'medium').length}
                </div>
                <div className="text-sm text-muted-foreground">Medium Risk</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">
                  {results.filter(r => r.riskLevel === 'high').length}
                </div>
                <div className="text-sm text-muted-foreground">High Risk</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
