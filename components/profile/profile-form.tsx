"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Globe, Link2, Loader2, Save } from "lucide-react";

import { AvatarUpload } from "@/components/profile/avatar-upload";
import { ThemeSelector } from "@/components/profile/theme-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type BrandSettings = {
  theme?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  fontPair?: string | null;
};

type SocialLinks = {
  website?: string | null;
  linkedin?: string | null;
  x?: string | null;
};

export type ProfileFormValues = {
  fullName: string;
  slug: string;
  title: string;
  headline: string;
  bio: string;
  avatarUrl: string;
  timezone: string;
  ctaText: string;
  brandSettings: BrandSettings;
  socialLinks: SocialLinks;
  onboardingCompleted?: boolean;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  minimumNoticeMinutes?: number;
  maxBookingsPerDay?: number | null;
};

export interface ProfileFormProps {
  className?: string;
  initialValues?: Partial<ProfileFormValues>;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit?: (values: ProfileFormValues) => Promise<void> | void;
}

const defaultValues: ProfileFormValues = {
  fullName: "",
  slug: "",
  title: "",
  headline: "",
  bio: "",
  avatarUrl: "",
  timezone: "Europe/Berlin",
  ctaText: "Apply to work with me",
  brandSettings: {
    theme: "light",
    primaryColor: "#0f172a",
    accentColor: "#6366f1",
    fontPair: "inter-manrope",
  },
  socialLinks: {
    website: "",
    linkedin: "",
    x: "",
  },
  onboardingCompleted: false,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  minimumNoticeMinutes: 0,
  maxBookingsPerDay: null,
};

function mergeInitialValues(
  values?: Partial<ProfileFormValues>,
): ProfileFormValues {
  return {
    ...defaultValues,
    ...values,
    brandSettings: {
      ...defaultValues.brandSettings,
      ...(values?.brandSettings ?? {}),
    },
    socialLinks: {
      ...defaultValues.socialLinks,
      ...(values?.socialLinks ?? {}),
    },
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProfileForm({
  className,
  initialValues,
  isSubmitting = false,
  submitLabel = "Save profile",
  onSubmit,
  ...props
}: ProfileFormProps) {
  const form = useForm<ProfileFormValues>({
    defaultValues: mergeInitialValues(initialValues),
    mode: "onSubmit",
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isDirty },
  } = form;

  const fullName = watch("fullName");
  const slug = watch("slug");
  const avatarUrl = watch("avatarUrl");
  const brandSettings = watch("brandSettings");
  const socialLinks = watch("socialLinks");

  React.useEffect(() => {
    if (!slug && fullName) {
      setValue("slug", slugify(fullName), {
        shouldDirty: true,
        shouldValidate: false,
      });
    }
  }, [fullName, setValue, slug]);

  async function submit(values: ProfileFormValues) {
    await onSubmit?.({
      ...values,
      slug: slugify(values.slug || values.fullName),
    });
  }

  const publicPreviewUrl = slug ? `/${slugify(slug)}` : "/your-slug";

  return (
    <div className={className} {...props}>
      <Form {...form}>
        <form className="space-y-6" onSubmit={handleSubmit(submit)}>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Public identity</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <FormField
                  control={control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile photo</FormLabel>
                      <FormControl>
                        <AvatarUpload
                          value={field.value}
                          onChange={field.onChange}
                          name={fullName}
                        />
                      </FormControl>
                      <FormDescription>
                        Upload or paste an image for your public page.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="fullName"
                    rules={{ required: "Full name is required." }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Carter" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="title"
                    rules={{ required: "Title is required." }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Fractional CTO" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={control}
                  name="slug"
                  rules={{ required: "Slug is required." }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Public slug</FormLabel>
                      <FormControl>
                        <div className="flex items-center rounded-md border border-slate-200 bg-white">
                          <span className="border-r border-slate-200 px-3 text-sm text-slate-500">
                            yourdomain.com/
                          </span>
                          <Input
                            className="border-0 shadow-none focus-visible:ring-0"
                            placeholder="john-carter"
                            {...field}
                            onChange={(event) =>
                              field.onChange(slugify(event.target.value))
                            }
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        This becomes your public expert page URL.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="headline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Headline</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="I help SaaS founders fix product bottlenecks before they become growth problems."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Your one-line value proposition on the public page.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell visitors who you help, what you do, and why they should trust you."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Keep it concise and outcome-focused.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="ctaText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CTA text</FormLabel>
                      <FormControl>
                        <Input placeholder="Apply to work with me" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is the main call-to-action on the public hero.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  <FormField
                    control={control}
                    name="brandSettings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme settings</FormLabel>
                        <FormControl>
                          <ThemeSelector
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormDescription>
                          Choose the visual style for your public page.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Public preview
                    </p>
                    <div className="mt-3 flex items-start gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={fullName || "Profile avatar"}
                            className="size-11 rounded-full object-cover"
                          />
                        ) : (
                          (fullName || "Y")
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {fullName || "Your name"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {watch("title") || "Your title"}
                        </p>
                        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <Globe className="size-3.5" />
                          {publicPreviewUrl}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Links & settings</CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <FormField
                      control={control}
                      name="socialLinks.website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://yourwebsite.com"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="socialLinks.linkedin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://linkedin.com/in/your-name"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name="socialLinks.x"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>X / Twitter</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://x.com/yourhandle"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <FormControl>
                            <Input placeholder="Europe/Berlin" {...field} />
                          </FormControl>
                          <FormDescription>
                            Used across your page and booking flow.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label muted>Connected links</Label>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Link2 className="size-4" />
                          {Object.values(socialLinks ?? {}).filter(Boolean).length} link
                          {Object.values(socialLinks ?? {}).filter(Boolean).length === 1
                            ? ""
                            : "s"}{" "}
                          connected
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Save your public profile
              </p>
              <p className="text-sm text-slate-500">
                This updates your expert page identity, branding, and links.
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  {submitLabel}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}