import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, CheckCircle, AlertTriangle, Loader2, X, ChevronDown } from 'lucide-react';
import { useUploadQueue } from '../../context/UploadQueueContext';

export function UploadBadge() {
  const { pendingUploads, currentUpload, isUploading } = useUploadQueue();
  const [isOpen, setIsOpen] = useState(false);

  const pendingCount = pendingUploads.length;
  const hasError = pendingUploads.some(u => u.uploadStatus === 'error');

  // Don't show if nothing pending and no current upload
  if (pendingCount === 0 && !currentUpload) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
          hasError
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : isUploading
            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            : currentUpload?.state === 'completed'
            ? 'bg-green-50 text-green-600 hover:bg-green-100'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : hasError ? (
          <AlertTriangle className="w-4 h-4" />
        ) : currentUpload?.state === 'completed' ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Upload className="w-4 h-4" />
        )}

        <span className="text-sm font-medium">
          {isUploading
            ? `Uploading... ${Math.round(currentUpload?.progress || 0)}%`
            : hasError
            ? `${pendingCount} failed`
            : currentUpload?.state === 'completed'
            ? 'Uploaded!'
            : `${pendingCount} pending`}
        </span>

        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown content */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Upload Queue</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Current upload progress */}
            {currentUpload && currentUpload.state !== 'completed' && (
              <div className="p-3 border-b border-gray-100 bg-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm font-medium text-blue-800">
                    {currentUpload.currentStep}
                  </span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currentUpload.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success message */}
            {currentUpload?.state === 'completed' && (
              <div className="p-3 border-b border-gray-100 bg-green-50">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Form uploaded successfully!
                  </span>
                </div>
              </div>
            )}

            {/* Pending uploads list */}
            <div className="max-h-60 overflow-y-auto">
              {pendingUploads.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No pending uploads
                </div>
              ) : (
                pendingUploads.map((form) => (
                  <div
                    key={form.id}
                    className={`p-3 border-b border-gray-50 last:border-0 ${
                      form.uploadStatus === 'error' ? 'bg-red-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {form.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {form.uploadStatus === 'error' ? (
                            <span className="text-red-600">{form.uploadError || 'Upload failed'}</span>
                          ) : form.uploadStatus === 'uploading' ? (
                            <span className="text-blue-600">Uploading...</span>
                          ) : (
                            'Pending'
                          )}
                        </p>
                      </div>
                      {form.uploadStatus === 'error' && (
                        <span className="flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer with link to admin */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <Link
                to="/admin?tab=uploads"
                onClick={() => setIsOpen(false)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Manage uploads in Admin →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
