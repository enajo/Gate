"use client";

import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import type { ProfileState } from "./profile-settings";
import { ServiceAccessCodes } from "./service-access-codes";

interface GateSettingsProps {
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
}

const availabilityExposureOptions = [
  { value: "THREE_DAYS", label: "3 days" },
  { value: "FIVE_DAYS", label: "5 days" },
  { value: "TWO_WEEKS", label: "2 weeks" },
  { value: "ONE_MONTH", label: "1 month" },
  { value: "TWO_MONTHS", label: "2 months" },
] as const;

function generateAccessCode() {
  return `GATE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function GateSettings({ profile, setProfile }: GateSettingsProps) {
  const activeService =
    profile.services.find((service) => service.id === profile.activeServiceId) ||
    profile.services[0];

  function setActiveService(serviceId: string) {
    setProfile((current) => ({
      ...current,
      activeServiceId: serviceId,
    }));
  }

  function updateService(
    serviceId: string,
    key: keyof ProfileState["services"][number],
    value: string | boolean,
  ) {
    setProfile((current) => ({
      ...current,
      services: current.services.map((service) =>
        service.id === serviceId ? { ...service, [key]: value } : service,
      ),
    }));
  }

  function addService() {
    const id = crypto.randomUUID();

    setProfile((current) => ({
      ...current,
      activeServiceId: id,
      services: [
        ...current.services,
        {
          id,
          title: "New Service",
          headline: "",
          duration: "30 min",
          format: "Video call",
          price: "",
          currency: "$",
          qualificationRequired: false,
          paymentRequired: false,
          accessCodeRequired: false,
          manualApprovalRequired: false,
          availabilityExposure: "FIVE_DAYS",
          currentAccessCode: generateAccessCode(),
          questions: [],
        },
      ],
    }));
  }

  function removeService(serviceId: string) {
    setProfile((current) => {
      const remainingServices = current.services.filter(
        (service) => service.id !== serviceId,
      );

      return {
        ...current,
        services: remainingServices,
        activeServiceId:
          current.activeServiceId === serviceId
            ? remainingServices[0]?.id ?? ""
            : current.activeServiceId,
      };
    });
  }

  function updateQuestion(serviceId: string, questionId: string, value: string) {
    setProfile((current) => ({
      ...current,
      services: current.services.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              questions: service.questions.map((question) =>
                question.id === questionId
                  ? { ...question, label: value }
                  : question,
              ),
            }
          : service,
      ),
    }));
  }

  function addQuestion(serviceId: string) {
    setProfile((current) => ({
      ...current,
      services: current.services.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              questions: [
                ...service.questions,
                {
                  id: crypto.randomUUID(),
                  label: "",
                  type: "textarea",
                  required: true,
                },
              ],
            }
          : service,
      ),
    }));
  }

  function removeQuestion(serviceId: string, questionId: string) {
    setProfile((current) => ({
      ...current,
      services: current.services.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              questions: service.questions.filter(
                (question) => question.id !== questionId,
              ),
            }
          : service,
      ),
    }));
  }

  return (
    <section id="gate" className="space-y-6">
      <div className="rounded-[1.75rem] border border-[#E7E5E4] bg-white/75 p-6 shadow-[0_18px_50px_rgba(120,100,80,0.06)]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-[#DFA767]" />

          <div>
            <p className="text-[15px] font-medium text-[#2B2B2B]">
              Gate Control
            </p>
            <p className="mt-1 text-[12px] text-[#6B7280]">
              Configure each service independently.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-[#E7E5E4] bg-white/75 p-6 shadow-[0_18px_50px_rgba(120,100,80,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-[#2B2B2B]">Services</p>
            <p className="mt-1 text-[12px] text-[#6B7280]">
              Each offer can have its own price, access rules, questions, and
              availability exposure.
            </p>
          </div>

          <button
            type="button"
            onClick={addService}
            className="inline-flex h-9 items-center rounded-full border border-[#D8D0C6] px-4 text-[13px] transition hover:border-[#2B2B2B]"
          >
            <Plus className="mr-2 size-4" />
            Add Service
          </button>
        </div>

        {profile.services.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {profile.services.map((service) => {
              const active = service.id === activeService?.id;

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setActiveService(service.id)}
                  className={
                    active
                      ? "rounded-full bg-[#2B2B2B] px-4 py-2 text-[13px] text-white"
                      : "rounded-full border border-[#D8D0C6] bg-white/70 px-4 py-2 text-[13px] text-[#57534E] transition hover:border-[#2B2B2B]"
                  }
                >
                  {service.title || "Untitled Service"}
                </button>
              );
            })}
          </div>
        )}

        {!activeService ? (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#D8D0C6] bg-white/50 p-8 text-center">
            <p className="text-[14px] text-[#6B7280]">No services yet.</p>
            <p className="mt-1 text-[12px] text-[#9CA3AF]">
              Click &quot;Add Service&quot; above to create your first offering.
            </p>
          </div>
        ) : (
        <div className="mt-6 rounded-[1.5rem] border border-[#E7E5E4] bg-white/70 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] font-medium text-[#2B2B2B]">
              Editing: {activeService.title || "Untitled Service"}
            </p>

            <button
              type="button"
              onClick={() => removeService(activeService.id)}
              title="Delete this service"
              className="text-[#9CA3AF] transition hover:text-red-500"
            >
              <Trash2 className="size-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Service Title">
              <input
                value={activeService.title}
                onChange={(event) =>
                  updateService(activeService.id, "title", event.target.value)
                }
                className="field-input"
              />
            </Field>

            <Field label="Duration">
              <input
                value={activeService.duration}
                onChange={(event) =>
                  updateService(activeService.id, "duration", event.target.value)
                }
                className="field-input"
                placeholder="30 min"
              />
            </Field>

            <Field label="Format">
              <input
                value={activeService.format}
                onChange={(event) =>
                  updateService(activeService.id, "format", event.target.value)
                }
                className="field-input"
                placeholder="Video call"
              />
            </Field>

            <Field label="Price">
              <div className="grid grid-cols-[76px_1fr] gap-2">
                <input
                  value={activeService.currency ?? ""}
                  onChange={(event) =>
                    updateService(
                      activeService.id,
                      "currency",
                      event.target.value,
                    )
                  }
                  className="field-input"
                  placeholder="$"
                />

                <input
                  value={activeService.price ?? ""}
                  onChange={(event) =>
                    updateService(activeService.id, "price", event.target.value)
                  }
                  className="field-input"
                  placeholder="500"
                />
              </div>
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Service Headline">
              <input
                value={activeService.headline}
                onChange={(event) =>
                  updateService(activeService.id, "headline", event.target.value)
                }
                className="field-input"
                placeholder="High-status promise for this specific offer"
              />
            </Field>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Toggle
              label="Qualification Required"
              checked={activeService.qualificationRequired}
              onChange={(value) =>
                updateService(activeService.id, "qualificationRequired", value)
              }
            />

            <Toggle
              label="Payment Required"
              checked={activeService.paymentRequired}
              onChange={(value) =>
                updateService(activeService.id, "paymentRequired", value)
              }
            />

            <Toggle
              label="Access Code Required"
              checked={activeService.accessCodeRequired}
              onChange={(value) =>
                updateService(activeService.id, "accessCodeRequired", value)
              }
            />

            <Toggle
              label="Manual Approval Required"
              checked={activeService.manualApprovalRequired}
              onChange={(value) =>
                updateService(activeService.id, "manualApprovalRequired", value)
              }
            />
          </div>

          <div className="mt-6">
            <Field label="Availability Exposure">
              <select
                value={activeService.availabilityExposure}
                onChange={(event) =>
                  updateService(
                    activeService.id,
                    "availabilityExposure",
                    event.target.value,
                  )
                }
                className="field-input"
              >
                {availabilityExposureOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Show {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {activeService.accessCodeRequired ? (
            <ServiceAccessCodes serviceId={activeService.id} />
          ) : null}
        </div>
        )}
      </div>

      {activeService?.qualificationRequired ? (
        <div className="rounded-[1.75rem] border border-[#E7E5E4] bg-white/75 p-6 shadow-[0_18px_50px_rgba(120,100,80,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[15px] font-medium text-[#2B2B2B]">
                Qualification Questions
              </p>
              <p className="mt-1 text-[12px] text-[#6B7280]">
                Questions are tied to the selected service.
              </p>
            </div>

            <button
              type="button"
              onClick={() => addQuestion(activeService.id)}
              className="inline-flex h-9 items-center rounded-full border border-[#D8D0C6] px-4 text-[13px] transition hover:border-[#2B2B2B]"
            >
              <Plus className="mr-2 size-4" />
              Add
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {activeService.questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-[1.25rem] border border-[#E7E5E4] bg-white/70 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[#6B7280]">
                    Question {index + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      removeQuestion(activeService.id, question.id)
                    }
                    className="text-[#9CA3AF] transition hover:text-red-500"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <input
                  value={question.label}
                  onChange={(event) =>
                    updateQuestion(
                      activeService.id,
                      question.id,
                      event.target.value,
                    )
                  }
                  className="field-input"
                  placeholder="Type your qualification question"
                />
              </div>
            ))}

            {!activeService.questions.length ? (
              <div className="rounded-[1.25rem] border border-dashed border-[#D8D0C6] bg-white/50 p-5 text-[13px] text-[#6B7280]">
                No questions yet. Add one to screen visitors before calendar
                access.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={
        checked
          ? "flex items-center justify-between rounded-[1.25rem] border border-[#DFA767] bg-[#FFF9F2] px-4 py-3"
          : "flex items-center justify-between rounded-[1.25rem] border border-[#E7E5E4] bg-white/70 px-4 py-3"
      }
    >
      <span className="text-[13px] font-medium text-[#2B2B2B]">{label}</span>

      <span
        className={
          checked
            ? "relative h-6 w-11 rounded-full bg-[#DFA767]"
            : "relative h-6 w-11 rounded-full bg-[#D6D3D1]"
        }
      >
        <span
          className={
            checked
              ? "absolute right-1 top-1 size-4 rounded-full bg-white"
              : "absolute left-1 top-1 size-4 rounded-full bg-white"
          }
        />
      </span>
    </button>
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