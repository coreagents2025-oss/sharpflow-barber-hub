import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type BucketType = "service-images" | "barbershop-logos" | "barbershop-heroes" | "barber-photos";

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (
    file: File,
    bucket: BucketType,
    path?: string
  ): Promise<string | null> => {
    try {
      setUploading(true);

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Formato de imagem inválido. Use JPG, PNG ou WEBP.");
        return null;
      }

      // Validate file size based on bucket
      const maxSizes: Record<BucketType, number> = {
        "service-images": 5 * 1024 * 1024, // 5MB
        "barbershop-logos": 2 * 1024 * 1024, // 2MB
        "barbershop-heroes": 5 * 1024 * 1024, // 5MB
        "barber-photos": 3 * 1024 * 1024, // 3MB
      };

      if (file.size > maxSizes[bucket]) {
        toast.error(`Imagem muito grande. Máximo: ${maxSizes[bucket] / 1024 / 1024}MB`);
        return null;
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = path || `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Upload error:", error);
        toast.error("Erro ao fazer upload da imagem");
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      toast.success("Imagem enviada com sucesso!");
      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload da imagem");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (url: string, bucket: BucketType): Promise<boolean> => {
    try {
      // Extract path from URL
      const urlParts = url.split(`/${bucket}/`);
      if (urlParts.length < 2) return false;
      
      const filePath = urlParts[1];

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error("Delete error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Delete error:", error);
      return false;
    }
  };

  return { uploadImage, deleteImage, uploading };
};
