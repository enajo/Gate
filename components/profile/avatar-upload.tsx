"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface AvatarUploadProps {
  className?: string;
  value?: string | null;
  name?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function getInitials(name?: string) {
  if (!name) return "YG";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AvatarUpload({
  className,
  value,
  name,
  onChange,
  placeholder = "Paste an image URL",
  disabled = false,
  ...props
}: AvatarUploadProps) {
  const [inputValue, setInputValue] = React.useState(value ?? "");
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setInputValue(value ?? "");
    setImageError(false);
  }, [value]);

  const hasImage = Boolean(value) && !imageError;

  function handleApply() {
    onChange?.(inputValue.trim());
  }

  function handleRemove() {
    setInputValue("");
    setImageError(false);
    onChange?.("");
  }

  return (
    <div className={cn("space-y-4", className)} {...props}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-sm">
            {hasImage ? (
              <Image
                src={value!}
                alt={name || "Profile avatar"}
                width={96}
                height={96}
                className="size-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center bg-slate-900 text-white">
                {value && imageError ? (
                  <ImagePlus className="size-6" />
                ) : (
                  <span className="text-lg font-semibold">
                    {getInitials(name)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">Profile photo</p>
          <p className="max-w-md text-sm text-slate-500">
            Paste a direct image URL for your public profile photo. A square
            image works best.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleApply}
            disabled={disabled}
          >
            <UploadCloud className="size-4" />
            Apply
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleRemove}
            disabled={disabled || (!value && !inputValue)}
          >
            <Trash2 className="size-4" />
            Remove
          </Button>
        </div>
      </div>

      {value && imageError ? (
        <p className="text-sm text-red-600">
          This image could not be loaded. Check the URL and try again.
        </p>
      ) : null}
    </div>
  );
}