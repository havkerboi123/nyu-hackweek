'use client';

import { useState, useRef } from 'react';
import { Upload, FileImage, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

type TestLevel = {
  name: string;
  value: string;
  reference_range: string | null;
  what_it_is: string;
  your_level_means: string;
  why_it_matters: string;
  possible_causes: string | null;
};

type LabReportResult = {
  success: boolean;
  id: string;
  timestamp: string;
  data: {
    type: string;
    levels: TestLevel[];
    concerns: string[];
  };
  warning?: string;
};

export function LabReportUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<LabReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Please upload an image file (PNG, JPG, GIF, or WEBP)');
      return;
    }

    // Validate file size (16MB max)
    if (selectedFile.size > 16 * 1024 * 1024) {
      setError('File size must be less than 16MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/lab-report', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage =
          data.message || data.error || 'Failed to analyze report. Please try again.';
        throw new Error(errorMessage);
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze report');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Lab Report Upload</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Upload and analyze patient lab reports using AI
          </p>
        </div>
      </div>

      {/* Upload Area */}
      {!preview && (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:border-gray-600 dark:bg-gray-900/50 dark:hover:border-blue-400"
          >
            <Upload className="mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
              Click to upload lab report image
            </p>
            <p className="text-muted-foreground text-sm">
              PNG, JPG, GIF, or WEBP (max 16MB)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Preview */}
      {preview && !result && (
        <div className="space-y-4">
          <div className="relative rounded-lg border border-gray-200 dark:border-gray-700">
            <img
              src={preview}
              alt="Lab report preview"
              className="h-auto w-full rounded-lg object-contain"
            />
            <button
              onClick={handleReset}
              className="absolute right-2 top-2 rounded-full bg-red-500 p-2 text-white shadow-lg transition-colors hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileImage className="h-5 w-5" />
                  Analyze Report
                </>
              )}
            </button>
            <button
              onClick={handleReset}
              disabled={uploading}
              className="rounded-lg border px-4 py-3 font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="font-semibold text-red-800 dark:text-red-300">Error</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="font-semibold text-green-800 dark:text-green-300">
                Report Analyzed Successfully
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Report ID: {result.id} | {new Date(result.timestamp).toLocaleString()}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 dark:border-green-700 dark:bg-gray-800 dark:text-green-400"
            >
              Upload Another
            </button>
          </div>

          {/* Test Type */}
          <div className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900/50">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Test Type</p>
            <p className="mt-1 text-lg font-semibold">{result.data.type}</p>
          </div>

          {/* Test Levels */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results</h3>
            <div className="space-y-3">
              {result.data.levels.map((level, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border bg-white p-4 dark:bg-gray-800 dark:border-gray-700"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-semibold">{level.name}</h4>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {level.value}
                    </span>
                  </div>
                  {level.reference_range && (
                    <p className="mb-2 text-sm text-muted-foreground">
                      Normal Range: {level.reference_range}
                    </p>
                  )}
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">What it is:</p>
                      <p className="text-muted-foreground">{level.what_it_is}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        Your level means:
                      </p>
                      <p className="text-muted-foreground">{level.your_level_means}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300">Why it matters:</p>
                      <p className="text-muted-foreground">{level.why_it_matters}</p>
                    </div>
                    {level.possible_causes && (
                      <div>
                        <p className="font-medium text-gray-700 dark:text-gray-300">
                          Possible causes:
                        </p>
                        <p className="text-muted-foreground">{level.possible_causes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Concerns */}
          {result.data.concerns.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <h3 className="mb-2 font-semibold text-yellow-800 dark:text-yellow-300">
                Concerns & Recommendations
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-yellow-700 dark:text-yellow-400">
                {result.data.concerns.map((concern, idx) => (
                  <li key={idx}>{concern}</li>
                ))}
              </ul>
            </div>
          )}

          {result.data.concerns.length === 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="font-semibold text-green-800 dark:text-green-300">
                ✓ No concerns detected. All values appear to be within normal ranges.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

