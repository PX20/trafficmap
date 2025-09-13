import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { Dashboard } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { X, Upload, Camera } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onStart?: () => void;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-S3
 *   uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onStart,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/*'],
      },
      autoProceed: true,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("file-added", () => {
        // Show progress dashboard when file is added
        const progressDiv = document.getElementById('uppy-progress');
        if (progressDiv) {
          progressDiv.style.display = 'block';
        }
        // Trigger start callback since autoProceed is true
        onStart?.();
      })
      .on("complete", (result: any) => {
        onComplete?.(result);
        // Hide progress and close modal after completion
        setTimeout(() => {
          const progressDiv = document.getElementById('uppy-progress');
          if (progressDiv) {
            progressDiv.style.display = 'none';
          }
          setShowModal(false);
        }, 1500);
      })
  );

  return (
    <div>
      <Button type="button" onClick={() => setShowModal(true)} className={buttonClassName}>
        {children}
      </Button>

      {/* Custom Modal Overlay */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Upload Profile Photo</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(false)}
                className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              {/* Custom Upload Area */}
              <div 
                className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center bg-blue-50 hover:bg-blue-100 transition-all duration-200 cursor-pointer group"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-blue-500', 'bg-blue-100');
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-blue-500', 'bg-blue-100');
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    // Clear existing files to prevent duplicates
                    uppy.getFiles().forEach(file => {
                      uppy.removeFile(file.id);
                    });
                    
                    uppy.addFile({
                      name: files[0].name,
                      type: files[0].type,
                      data: files[0],
                    });
                  }
                }}
                onClick={() => {
                  const fileInput = document.createElement('input');
                  fileInput.type = 'file';
                  fileInput.accept = 'image/*';
                  fileInput.onchange = (event) => {
                    const files = (event.target as HTMLInputElement).files;
                    if (files && files.length > 0) {
                      // Clear existing files to prevent duplicates
                      uppy.getFiles().forEach(file => {
                        uppy.removeFile(file.id);
                      });
                      
                      uppy.addFile({
                        name: files[0].name,
                        type: files[0].type,
                        data: files[0],
                      });
                    }
                  };
                  fileInput.click();
                }}
              >
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                      <Upload className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-gray-700">Upload an image</h4>
                    <p className="text-gray-500">Drag and drop an image here, or click to browse</p>
                    <p className="text-sm text-gray-400">Images only • Max 5MB • JPG, PNG, or GIF</p>
                  </div>
                </div>
              </div>
              
              {/* Uppy Dashboard - only shows progress when files are uploading */}
              <div className="mt-4" style={{ display: 'none' }} id="uppy-progress">
                <Dashboard
                  uppy={uppy}
                  proudlyDisplayPoweredByUppy={false}
                  hideUploadButton={true}
                  height={150}
                  theme="light"
                  hideProgressDetails={false}
                  hideRetryButton={false}
                  hideCancelButton={false}
                  hidePauseResumeButton={true}
                  hideProgressAfterFinish={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}