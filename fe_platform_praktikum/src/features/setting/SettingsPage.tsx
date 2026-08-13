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
import LecturerLayout from "../lecturer/components/LecturerLayout";
import { toast } from "../../components/toast/toastStore";
import type { User } from "../../services/user/types";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function showSettingsError(message: string) {
  const warningPatterns = [
    "sudah digunakan",
    "tidak sama",
    "minimal",
    "wajib",
    "format",
    "tidak valid",
  ];
  const normalized = message.toLowerCase();

  if (warningPatterns.some((pattern) => normalized.includes(pattern))) {
    toast.warning(message);
    return;
  }

  toast.error(message);
}

export default function SettingsPage() {
  const { user, setUser } = useCurrentUser();
  const [activeTab, setActiveTab] = useState("Profil");
  const [profileSaving, setProfileSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
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

  const applyUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("authUser", JSON.stringify(updatedUser));
  };

  const saveUser = async (payload: UpdateUserPayload, successMessage: string) => {
    setProfileSaving(true);

    try {
      const updatedUser = await updateUser(user.id, payload);
      applyUser(updatedUser);
      toast.success(successMessage);
    } catch (error) {
      showSettingsError(getErrorMessage(error, "Gagal memperbarui data pribadi."));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUploadAvatar = async (file: File) => {
    setProfileSaving(true);

    try {
      const updatedUser = await uploadUserAvatar(user.id, file);
      applyUser(updatedUser);
      toast.success("Foto profil berhasil diperbarui.");
    } catch (error) {
      showSettingsError(getErrorMessage(error, "Gagal memperbarui foto profil."));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePersonalData = async (personalData: PersonalData) => {
    await saveUser(
      { personalData },
      "Data pribadi berhasil diperbarui.",
    );
  };

  const handleRequestEmailChange = async (payload: {
    email: string;
    currentPassword: string;
  }) => {
    setEmailSaving(true);

    try {
      await verifyUserPassword(user.id, payload.currentPassword);
      setPendingEmailChange(payload);
    } catch (error) {
      showSettingsError(getErrorMessage(error, "Gagal memverifikasi kata sandi."));
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

    try {
      await requestUserEmailChangeOtp(user.id, pendingEmailChange);
      toast.info("Kode OTP telah dikirim ke email baru.");
    } catch (error) {
      showSettingsError(getErrorMessage(error, "Gagal mengirim OTP."));
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

    try {
      const otpCode = payload.otp.trim();

      if (!otpCode) {
        throw new Error("OTP wajib diisi.");
      }

      const updatedUser = await verifyUserEmailChangeOtp(user.id, {
        otp: otpCode,
      });

      applyUser(updatedUser);
      setPendingEmailChange(null);
      toast.success("Email berhasil diperbarui.");
    } catch (error) {
      showSettingsError(getErrorMessage(error, "Gagal memperbarui email."));
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

    try {
      await updateUserPassword(user.id, payload);
      toast.success("Kata sandi berhasil diperbarui.");
    } catch (error) {
      showSettingsError(getErrorMessage(error, "Gagal memperbarui kata sandi."));
      throw error;
    } finally {
      setPasswordSaving(false);
    }
  };

  const settingsContent = (
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
          onUploadAvatar={handleUploadAvatar}
        />
      )}

      {activeTab === "Data Pribadi" && (
        <PersonalDataSection
          data={user.personalData}
          saving={profileSaving}
          onSave={handleSavePersonalData}
        />
      )}

      {activeTab === "Akun" && (
        <AccountSection
          email={user.email}
          emailSaving={emailSaving}
          passwordSaving={passwordSaving}
          onRequestEmailChange={handleRequestEmailChange}
          onSendEmailOtp={handleSendEmailOtp}
          onVerifyEmailChange={handleVerifyEmailChange}
          onChangePassword={handleChangePassword}
        />
      )}
    </SettingsLayout>
  );

  if (isAdmin) {
    return (
      <AdminLayout>
        <TopProgressBar />
        {settingsContent}
      </AdminLayout>
    );
  }

  if (user.role === "DOSEN") {
    return (
      <LecturerLayout>
        {settingsContent}
      </LecturerLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <TopProgressBar />
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
        {settingsContent}
      </main>
    </div>
  );
}
