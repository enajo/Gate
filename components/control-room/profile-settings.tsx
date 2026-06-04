import { ImagePlus, UserRound } from "lucide-react";
import type { PublicSalesPageTemplateData } from "@/components/public-page/public-sales-page-template";

export type ProfileState = PublicSalesPageTemplateData;

interface ProfileSettingsProps {
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "G"
  );
}

export function ProfileSettings({ profile, setProfile }: ProfileSettingsProps) {
  const initials = getInitials(profile.name);

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    setProfile((current) => ({
      ...current,
      avatarUrl: previewUrl,
    }));
  }

  return (
    <section className="rounded-[1.75rem] border border-[#E7E5E4] bg-white/75 p-6 shadow-[0_18px_50px_rgba(120,100,80,0.06)]">
      <div className="flex items-center gap-3">
        <UserRound className="size-5 text-[#DFA767]" />

        <div>
          <p className="text-[15px] font-medium text-[#2B2B2B]">Profile</p>
          <p className="mt-1 text-[12px] text-[#6B7280]">
            Public identity shown across all services.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-[#E7E5E4] bg-white/70 p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#111827] text-[20px] font-medium text-white">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.name || "Expert image"}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <ImagePlus className="size-4 text-[#6B7280]" />

              <p className="text-[13px] font-medium text-[#2B2B2B]">
                Expert Image / Logo
              </p>
            </div>

            <p className="mt-1 max-w-lg text-[12px] leading-6 text-[#6B7280]">
              Upload a professional headshot, brand mark, or company logo. If no
              image is uploaded, GATE automatically uses the expert acronym.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />

              <label
                htmlFor="avatar-upload"
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-[#D8D0C6] bg-white px-4 text-[13px] font-medium text-[#2B2B2B] transition hover:border-[#2B2B2B]"
              >
                Upload Image
              </label>

              {profile.avatarUrl ? (
                <button
                  type="button"
                  onClick={() =>
                    setProfile((current) => ({
                      ...current,
                      avatarUrl: null,
                    }))
                  }
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#F1D5D5] bg-[#FFF5F5] px-4 text-[13px] font-medium text-[#B42318] transition hover:bg-[#FEECEC]"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Public Name">
          <input
            value={profile.name}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            className="field-input"
            placeholder="John Carter"
          />
        </Field>

        <Field label="Core Title">
          <input
            value={profile.role}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                role: event.target.value,
              }))
            }
            className="field-input"
            placeholder="Fractional CTO"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Short Bio">
          <textarea
            value={profile.bio || ""}
            onChange={(event) =>
              setProfile((current) => ({
                ...current,
                bio: event.target.value,
              }))
            }
            className="min-h-28 w-full resize-none rounded-[1.25rem] border border-[#D8D0C6] bg-white/80 px-4 py-3 text-[14px] leading-7 outline-none transition focus:border-[#2B2B2B]"
            placeholder="Describe your expertise, track record, and who you help."
          />
        </Field>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-medium text-[#2B2B2B]">
        {label}
      </span>

      {children}
    </label>
  );
}