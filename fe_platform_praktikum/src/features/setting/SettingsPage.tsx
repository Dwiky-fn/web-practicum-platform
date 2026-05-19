import { useState } from "react";
import { useCurrentUser } from "../../services/user/useCurrentUser";
import Navbar from "../../components/navbar/Navbar";
import SettingsLayout from "./components/SettingsLayout";
import ProfileSection from "./components/ProfileSection";
import PersonalDataSection from "./components/PersonalDataSection";
import AccountSection from "./components/AccountSection";
import TopProgressBar from "../../components/loading/TopProgressBar";

export default function SettingsPage() {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("Profil");

  if (!user) {
    return <div className="p-10">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TopProgressBar />

      <SettingsLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      >
        {activeTab === "Profil" && (
          <ProfileSection
            role={user.role}
            avatarUrl={user.avatarUrl}
            data={
              user.role === 'MAHASISWA'
                ? {fullname: user.fullname, ...user.studentProfile}
                : user.role === 'DOSEN'
                ? {fullname: user.fullname, ...user.lecturerProfile}
                : {fullname: user.fullname, ...user.adminProfile}
            }
          />
        )}

        {activeTab === "Data Pribadi" && (
  <>
    {console.log("personalData:", user.personalData)}
    <PersonalDataSection data={user.personalData} />
  </>
)}

        {activeTab === "Akun" && (
          <AccountSection />
        )}
      </SettingsLayout>
    </div>
  );
}
