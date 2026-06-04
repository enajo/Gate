import { AppearanceSettings } from "./appearance-settings";
import { AvailabilitySettings } from "./availability-settings";
import { GateSettings } from "./gate-settings";
import { ProfileSettings, type ProfileState } from "./profile-settings";

interface ControlRoomFormProps {
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
}

export function ControlRoomForm({ profile, setProfile }: ControlRoomFormProps) {
  return (
    <div className="space-y-6">
      <ProfileSettings profile={profile} setProfile={setProfile} />

      <GateSettings profile={profile} setProfile={setProfile} />

      <AvailabilitySettings />

      <AppearanceSettings profile={profile} setProfile={setProfile} />
    </div>
  );
}