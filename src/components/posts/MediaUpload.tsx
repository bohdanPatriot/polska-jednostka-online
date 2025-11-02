import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, X, Image, Video, Music } from "lucide-react";

interface MediaUploadProps {
  postId?: string;
  onUploadComplete?: (fileUrl: string, fileType: string) => void;
}

export function MediaUpload({ postId, onUploadComplete }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ url: string; type: string; name: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (file.size > maxSize) {
      toast({
        title: "Błąd",
        description: "Plik jest za duży. Maksymalny rozmiar to 100MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("post-media")
        .getPublicUrl(filePath);

      const fileType = file.type.startsWith("image/") ? "image" :
                       file.type.startsWith("video/") ? "video" :
                       file.type.startsWith("audio/") ? "audio" : "file";

      if (postId) {
        const { error: dbError } = await supabase.from("post_attachments").insert({
          post_id: postId,
          file_url: publicUrl,
          file_type: fileType,
          file_name: file.name,
          file_size: file.size,
        });

        if (dbError) throw dbError;
      }

      setUploadedFiles([...uploadedFiles, { url: publicUrl, type: fileType, name: file.name }]);
      
      if (onUploadComplete) {
        onUploadComplete(publicUrl, fileType);
      }

      toast({
        title: "Sukces",
        description: "Plik został przesłany",
      });
    } catch (error: any) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type === "image") return <Image className="h-4 w-4" />;
    if (type === "video") return <Video className="h-4 w-4" />;
    if (type === "audio") return <Music className="h-4 w-4" />;
    return <Upload className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="h-4 w-4 mr-2" />
        {uploading ? "Przesyłanie..." : "Dodaj media"}
      </Button>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                {getFileIcon(file.type)}
                <span className="text-sm truncate max-w-[200px]">{file.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
