import { FileText, File } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";
import { Progress } from "./ui/progress";

export default function FileUpload({ upload, status, addFiles, files, removeFile }: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (status === "loading") {
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          const next = prev + Math.floor(Math.random() * 10) + 5;
          return next >= 95 ? 95 : next;
        });
      }, 300);
      return () => clearInterval(interval);
    } else {
      setUploadProgress(0);
    }
  }, [status]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Card className="w-full border bg-background">
      <CardHeader>
        <CardTitle className="text-center text-lg">Upload Bank Statements</CardTitle>
      </CardHeader>
      <CardContent>
        {status !== "loading" && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${
              isDragging ? "border-muted-foreground bg-muted" : "border-muted"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
          >
            <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="mb-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Drag and drop</span> files here, or
              <span className="text-primary cursor-pointer hover:underline"> browse</span>
              <input
                type="file"
                multiple
                accept=".pdf,.csv,.txt,.docx,.xlsx,.md,.jpg,.jpeg,.png"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </p>
            <p className="text-xs text-muted-foreground">Supported format: PDF</p>
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Selected Files ({files.length})</h3>
            <div className="space-y-2 max-h-60 overflow-auto">
              {files.map((file: File, id: number) => (
                <div key={id} className="flex items-center justify-between bg-muted rounded-md p-2 text-sm">
                  <div className="flex items-center">
                    <File className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span className="truncate max-w-[200px] text-foreground">{file.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                  </div>
                  {status !== "loading" && (
                    <button
                      onClick={() => removeFile(file.name)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="my-4">
            <p className="text-sm font-medium mb-2 text-foreground">Uploading files...</p>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </CardContent>
      {status !== "loading" && (
        <CardFooter>
          <Button onClick={upload} disabled={files.length === 0 || status === "loading"} className="w-full">
            {files.length === 0 ? "Upload Files" : `Process ${files.length} Files`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
