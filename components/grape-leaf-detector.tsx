"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Leaf, Camera, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface PredictionResult {
  disease: string
  confidence: number
  description?: string
  treatment?: string
}

export function GrapeLeafDetector() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setPrediction(null)
      setError(null)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setPrediction(null)
      setError(null)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const analyzeLead = async () => {
    if (!selectedFile) return

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("image", selectedFile)

      const response = await fetch("/api/predict", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to analyze image")
      }

      const result = await response.json()
      setPrediction(result)
    } catch (err) {
      setError("Failed to analyze the image. Please try again.")
      console.error("Prediction error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const resetAnalysis = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setPrediction(null)
    setError(null)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-100 text-green-800 border-green-200"
    if (confidence >= 0.6) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="h-4 w-4" />
    return <AlertCircle className="h-4 w-4" />
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Leaf className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Grape Leaf Disease Detector</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload an image of a grape leaf to detect potential diseases using advanced AI analysis. Get instant results
          with confidence scores to help protect your vineyard.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Camera className="h-5 w-5" />
              Upload Grape Leaf Image
            </CardTitle>
            <CardDescription>Select or drag and drop a clear image of a grape leaf for analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl || "/placeholder.svg"}
                    alt="Selected grape leaf"
                    className="max-h-48 mx-auto rounded-lg object-cover"
                  />
                  <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-foreground font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG, JPEG up to 10MB</p>
                  </div>
                </div>
              )}
            </div>

            <input id="file-input" type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

            <div className="flex gap-2">
              <Button
                onClick={analyzeLead}
                disabled={!selectedFile || isLoading}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Leaf className="h-4 w-4 mr-2" />
                    Analyze Leaf
                  </>
                )}
              </Button>
              {selectedFile && (
                <Button variant="outline" onClick={resetAnalysis}>
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Analysis Results</CardTitle>
            <CardDescription>AI-powered disease detection results and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="border-destructive/50 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {prediction ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">Detected Disease</h3>
                    <Badge className={`${getConfidenceColor(prediction.confidence)} flex items-center gap-1`}>
                      {getConfidenceIcon(prediction.confidence)}
                      {Math.round(prediction.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <p className="text-lg font-medium text-card-foreground">{prediction.disease}</p>
                  {prediction.description && (
                    <p className="text-sm text-muted-foreground mt-2">{prediction.description}</p>
                  )}
                </div>

                {prediction.treatment && (
                  <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                    <h4 className="font-medium text-foreground mb-2">Recommended Treatment</h4>
                    <p className="text-sm text-muted-foreground">{prediction.treatment}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  <p>
                    ⚠️ This analysis is for informational purposes only. Consult with agricultural experts for
                    professional diagnosis and treatment recommendations.
                  </p>
                </div>
              </div>
            ) : !isLoading && !error ? (
              <div className="text-center py-8 text-muted-foreground">
                <Leaf className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upload an image to see analysis results</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      {/* Footer  */}
      <div className="text-center mt-8 text-sm text-muted-foreground">
        Made with 💚 in 🇲🇦
      </div>
    </div>
  )
}
