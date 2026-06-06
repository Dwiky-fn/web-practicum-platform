import { useState } from "react";
import { useCurrentUser } from "../../services/user/useCurrentUser";
import {
  updateUser,
  updateUserPassword,
  uploadUserAvatar,
  requestUserEmailChangeOtp,
  verifyUserEmailChangeOtp,
  verifyUserPassword,
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
  const [profileSaving, setProfileSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [pendingEmailChange, setPendingEmailChange] = useState<{
    email: string;
    currentPassword: string;
  } | null>(null);

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
    setProfileSaving(true);
    setMessage("");

    try {
      const updatedUser = await updateUser(user.id, payload);
      setUser(updatedUser);
      setMessage(successMessage);
    } catch (error) {
      console.error(error);
      setMessage("Gagal menyimpan perubahan.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUploadAvatar = async (file: File) => {
    setProfileSaving(true);
    setMessage("");

    try {
      const updatedUser = await uploadUserAvatar(user.id, file);
      setUser(updatedUser);
      setMessage("Foto profil berhasil diupload.");
    } catch (error) {
      console.error(error);
      setMessage("Gagal mengupload foto profil.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePersonalData = async (personalData: PersonalData) => {
    await saveUser(
      { personalData },
      "Data pribadi berhasil disimpan.",
    );
  };

  const handleRequestEmailChange = async (payload: {
    email: string;
    currentPassword: string;
  }) => {
    setEmailSaving(true);
    setEmailMessage("");
    setPasswordMessage("");

    try {
      await verifyUserPassword(user.id, payload.currentPassword);
      setPendingEmailChange(payload);
      setEmailMessage("");
    } catch (error) {
      console.error(error);
      setEmailMessage(
        error instanceof Error ? error.message : "Gagal memverifikasi password.",
      );
      throw error;
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!pendingEmailChange) {
      throw new Error("Data perubahan email belum siap.");
    }

    setEmailSaving(true);
    setEmailMessage("");
    setPasswordMessage("");

    try {
      await requestUserEmailChangeOtp(user.id, pendingEmailChange);
      setEmailMessage("Kode OTP telah dikirim ke email baru.");
    } catch (error) {
      console.error(error);
      setEmailMessage(
        error instanceof Error ? error.message : "Gagal mengirim OTP.",
      );
      throw error;
    } finally {
      setEmailSaving(false);
    }
  };

  const handleVerifyEmailChange = async (payload: {
    email: string;
    currentPassword: string;
    otp: string;
  }) => {
    setEmailSaving(true);
    setEmailMessage("");
    setPasswordMessage("");

    try {
      const otpCode = payload.otp.trim();

      if (!otpCode) {
        throw new Error("OTP wajib diisi.");
      }

      const updatedUser = await verifyUserEmailChangeOtp(user.id, {
        otp: otpCode,
      });

      setUser(updatedUser);
      setPendingEmailChange(null);
      setEmailMessage("Email berhasil diperbarui.");
    } catch (error) {
      console.error(error);
      setEmailMessage(
        error instanceof Error ? error.message : "Gagal memperbarui email.",
      );
      throw error;
    } finally {
      setEmailSaving(false);
    }
  };

  const handleChangePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    setPasswordSaving(true);
    setPasswordMessage("");
    setEmailMessage("");

    try {
      await updateUserPassword(user.id, payload);
      setPasswordMessage("Password berhasil diperbarui.");
    } catch (error) {
      console.error(error);
      setPasswordMessage(
        error instanceof Error ? error.message : "Gagal memperbarui password.",
      );
      throw error;
    } finally {
      setPasswordSaving(false);
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
            saving={profileSaving}
            message={message}
            onUploadAvatar={handleUploadAvatar}
          />
        )}

        {activeTab === "Data Pribadi" && (
          <PersonalDataSection
            data={user.personalData}
            saving={profileSaving}
            message={message}
            onSave={handleSavePersonalData}
          />
        )}

        {activeTab === "Akun" && (
          <AccountSection
            email={user.email}
            emailSaving={emailSaving}
            passwordSaving={passwordSaving}
            emailMessage={emailMessage}
            passwordMessage={passwordMessage}
            onRequestEmailChange={handleRequestEmailChange}
            onSendEmailOtp={handleSendEmailOtp}
            onVerifyEmailChange={handleVerifyEmailChange}
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
