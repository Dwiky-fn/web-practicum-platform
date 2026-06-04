import { useState } from "react";
import { useCurrentUser } from "../../services/user/useCurrentUser";
import {
  updateUser,
  updateUserEmail,
  updateUserPassword,
  uploadUserAvatar,
} from "../../services/user/service";
import type { PersonalData, UpdateUserPayload } from "../../services/user/types";
import Navbar from "../../components/navbar/Navbar";
import SettingsLayout from "./components/SettingsLayout";
import ProfileSection from "./components/ProfileSection";
import PersonalDataSection from "./components/PersonalDataSection";
import AccountSection from "./components/AccountSection";
import TopProgressBar from "../../components/loading/TopProgressBar";
import AdminLayout from "../admin/components/AdminLayout";

export default function SettingsPage() {
  const { user, setUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("Profil");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (!user) {
    return <div className="p-10">Loading...</div>
  }

  const profileData =
    user.role === "MAHASISWA"
      ? { fullname: user.fullname, ...user.studentProfile }
      : user.role === "DOSEN"
      ? { fullname: user.fullname, ...user.lecturerProfile }
      : { fullname: user.fullname, ...user.adminProfile };
  const isAdmin = user.role === "ADMIN";

  const saveUser = async (payload: UpdateUserPayload, successMessage: string) => {
    setSaving(true);
    setMessage("");

    try {
      const updatedUser = await updateUser(user.id, payload);
      setUser(updatedUser);
      setMessage(successMessage);
    } catch (error) {
      console.error(error);
      setMessage("Gagal menyimpan perubahan.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async (file: File) => {
    setSaving(true);
    setMessage("");

    try {
      const updatedUser = await uploadUserAvatar(user.id, file);
      setUser(updatedUser);
      setMessage("Foto profil berhasil diupload.");
    } catch (error) {
      console.error(error);
      setMessage("Gagal mengupload foto profil.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonalData = async (personalData: PersonalData) => {
    await saveUser(
      { personalData },
      "Data pribadi berhasil disimpan.",
    );
  };

  const handleChangeEmail = async (payload: {
    email: string;
    currentPassword: string;
  }) => {
    setSaving(true);
    setMessage("");

    try {
      const updatedUser = await updateUserEmail(user.id, payload);
      setUser(updatedUser);
      setMessage("Email berhasil diperbarui.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Gagal memperbarui email.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    setSaving(true);
    setMessage("");

    try {
      await updateUserPassword(user.id, payload);
      setMessage("Password berhasil diperbarui.");
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Gagal memperbarui password.");
    } finally {
      setSaving(false);
    }
  };

  const settingsContent = (
    <>
      <SettingsLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      >
        {activeTab === "Profil" && (
          <ProfileSection
            role={user.role}
            avatarUrl={user.avatarUrl}
            data={profileData}
            saving={saving}
            message={message}
            onUploadAvatar={handleUploadAvatar}
          />
        )}

        {activeTab === "Data Pribadi" && (
          <PersonalDataSection
            data={user.personalData}
            saving={saving}
            message={message}
            onSave={handleSavePersonalData}
          />
        )}

        {activeTab === "Akun" && (
          <AccountSection
            email={user.email}
            saving={saving}
            message={message}
            onChangeEmail={handleChangeEmail}
            onChangePassword={handleChangePassword}
          />
        )}
      </SettingsLayout>
    </>
  );

  if (isAdmin) {
    return (
      <AdminLayout>
        <TopProgressBar />
        {settingsContent}
      </AdminLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TopProgressBar />
      {settingsContent}
    </div>
  );
}
